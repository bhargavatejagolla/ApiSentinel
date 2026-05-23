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

// ─── POST /api/services/auth ─── Login endpoint
export async function POST(req: NextRequest) {
  const cfg = chaosStore.getConfig();
  const start = Date.now();

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const username = (body.username as string) || 'user';
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'API-Sentinel-Simulator/1.0';

  // Simulate auth service processing time
  await randomDelay(cfg.authLatency);
  const latency = Date.now() - start;

  // Auth breach scenario: flag as attacker if failure rate very high
  const isAttackScenario = cfg.scenario === 'auth_breach';
  const attackIp = '198.51.100.42';
  const effectiveIp = isAttackScenario ? attackIp : clientIp;
  const effectiveAgent = isAttackScenario
    ? 'python-requests/2.31.0'
    : userAgent;

  if (shouldFail(cfg.authFailureRate)) {
    writeLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/services/auth/login',
      status: 401,
      latency,
      clientIp: effectiveIp,
      userAgent: effectiveAgent,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestPayload: JSON.stringify({ username }),
      responsePayload: JSON.stringify({ error: 'Unauthorized', message: 'Invalid credentials' }),
      errorMessage: isAttackScenario
        ? 'SECURITY: Brute force credentials attempt detected from ' + attackIp
        : 'Authentication failed: invalid username or password',
    });
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid credentials' },
      { status: 401 }
    );
  }

  const token = `jwt_${Math.random().toString(36).substring(2, 18)}`;
  writeLog({
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/api/services/auth/login',
    status: 200,
    latency,
    clientIp: effectiveIp,
    userAgent: effectiveAgent,
    requestHeaders: { 'Content-Type': 'application/json' },
    requestPayload: JSON.stringify({ username }),
    responsePayload: JSON.stringify({ success: true, token, expiresIn: 3600 }),
  });

  return NextResponse.json({ success: true, token, expiresIn: 3600 });
}

// ─── GET /api/services/auth ─── Profile endpoint (requires Bearer token)
export async function GET(req: NextRequest) {
  const cfg = chaosStore.getConfig();
  const start = Date.now();
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'API-Sentinel-Simulator/1.0';
  const authHeader = req.headers.get('authorization') || '';

  await randomDelay([cfg.authLatency[0] / 2, cfg.authLatency[1] / 2]);
  const latency = Date.now() - start;

  if (!authHeader.startsWith('Bearer ')) {
    writeLog({
      timestamp: new Date().toISOString(),
      method: 'GET',
      path: '/api/services/auth/profile',
      status: 401,
      latency,
      clientIp,
      userAgent,
      requestHeaders: { Authorization: authHeader },
      responsePayload: JSON.stringify({ error: 'Missing Bearer token' }),
      errorMessage: 'No authorization header',
    });
    return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
  }

  writeLog({
    timestamp: new Date().toISOString(),
    method: 'GET',
    path: '/api/services/auth/profile',
    status: 200,
    latency,
    clientIp,
    userAgent,
    requestHeaders: { Authorization: authHeader.slice(0, 20) + '...' },
    responsePayload: JSON.stringify({ userId: 'usr_' + Math.random().toString(36).slice(2, 8), email: 'user@example.com', role: 'customer' }),
  });

  return NextResponse.json({
    userId: 'usr_' + Math.random().toString(36).slice(2, 8),
    email: 'user@example.com',
    role: 'customer',
  });
}
