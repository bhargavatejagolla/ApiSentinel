import { NextRequest, NextResponse } from 'next/server';
import { chaosStore, randomDelay, shouldFail } from '@/lib/chaos-store';
import { logStore } from '@/lib/log-store';
import { APILog } from '@/types';

function makeLogId() {
  return `log_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString().slice(-5)}`;
}

function writeLog(log: Omit<APILog, 'id'> & { id?: string }) {
  const entry: APILog = { id: log.id ?? makeLogId(), ...log } as APILog;
  logStore.addLogs([entry]);
  return entry;
}

// ─── POST /api/services/payment ─── Checkout endpoint
// This is the ROOT of all cascade failures
export async function POST(req: NextRequest) {
  const cfg = chaosStore.getConfig();
  const start = Date.now();
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'API-Sentinel-Simulator/1.0';

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const orderId = (body.orderId as string) || `ord_${Math.random().toString(36).slice(2, 9)}`;
  const amount = (body.amount as number) ?? Math.floor(Math.random() * 200) + 10;

  // Apply real payment latency — this is what causes DB timeout cascades
  await randomDelay(cfg.paymentLatency);
  const latency = Date.now() - start;

  // Gateway timeout: if latency > 3000ms, return 504 regardless of failure rate
  if (latency > 3000) {
    writeLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/services/payment/checkout',
      status: 504,
      latency,
      clientIp,
      userAgent,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestPayload: JSON.stringify({ orderId, amount }),
      responsePayload: JSON.stringify({ error: 'Gateway Timeout', message: 'Payment gateway failed to respond in time' }),
      errorMessage: `Gateway Timeout after ${latency}ms — DB connection pool exhausted`,
    });
    return NextResponse.json(
      { error: 'Gateway Timeout', message: 'Payment gateway failed to respond in time', latencyMs: latency },
      { status: 504 }
    );
  }

  if (shouldFail(cfg.paymentFailureRate)) {
    const isDbTimeout = cfg.scenario === 'db_timeout' || cfg.scenario === 'cascade_failure';
    writeLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/services/payment/checkout',
      status: 503,
      latency,
      clientIp,
      userAgent,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestPayload: JSON.stringify({ orderId, amount }),
      responsePayload: JSON.stringify({ error: 'Service Unavailable', message: isDbTimeout ? 'Database connection pool exhausted' : 'Payment processor temporarily unavailable' }),
      errorMessage: isDbTimeout
        ? 'DBError: max_connections reached — cannot allocate new connection from pool'
        : 'PaymentGatewayError: upstream processor returned 503',
    });
    return NextResponse.json(
      {
        error: 'Service Unavailable',
        message: isDbTimeout ? 'Database connection pool exhausted' : 'Payment processor temporarily unavailable',
      },
      { status: 503 }
    );
  }

  const receiptId = `rec_${Math.random().toString(36).slice(2, 10)}`;
  writeLog({
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/api/services/payment/checkout',
    status: 200,
    latency,
    clientIp,
    userAgent,
    requestHeaders: { 'Content-Type': 'application/json' },
    requestPayload: JSON.stringify({ orderId, amount }),
    responsePayload: JSON.stringify({ success: true, receiptId, amount, processingTimeMs: latency }),
  });

  return NextResponse.json({ success: true, receiptId, amount, processingTimeMs: latency });
}

// ─── GET /api/services/payment ─── Health check
export async function GET() {
  const cfg = chaosStore.getConfig();
  const isHealthy = cfg.paymentFailureRate < 0.3;
  return NextResponse.json({
    service: 'payment',
    status: isHealthy ? 'healthy' : 'degraded',
    scenario: cfg.scenario,
    failureRate: cfg.paymentFailureRate,
    latencyRange: cfg.paymentLatency,
  });
}
