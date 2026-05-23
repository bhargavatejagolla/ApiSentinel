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

// ─── POST /api/services/cart ─── Add item to cart
// Cart calls payment internally → cascading failures when payment is down
export async function POST(req: NextRequest) {
  const cfg = chaosStore.getConfig();
  const start = Date.now();
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'API-Sentinel-Simulator/1.0';

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const itemId = (body.itemId as string) || `item_${Math.random().toString(36).slice(2, 8)}`;
  const quantity = (body.quantity as number) ?? Math.floor(Math.random() * 3) + 1;
  const userId = (body.userId as string) || `usr_${Math.random().toString(36).slice(2, 8)}`;

  // Apply cart-level latency
  await randomDelay(cfg.cartLatency);

  // ─── CASCADE: If cascade is enabled, call payment to check availability ───
  let paymentStatus = 200;
  let paymentLatency = 0;
  if (cfg.cascadeEnabled) {
    const payStart = Date.now();
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const payRes = await fetch(`${origin}/api/services/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: `pre_${itemId}`, amount: 0.01 }),
        signal: AbortSignal.timeout(5000),
      });
      paymentStatus = payRes.status;
      paymentLatency = Date.now() - payStart;
    } catch {
      paymentStatus = 503;
      paymentLatency = Date.now() - payStart;
    }
  }

  const latency = Date.now() - start;

  // If payment is failing and cascade is on → cart also fails
  if (cfg.cascadeEnabled && paymentStatus >= 500) {
    writeLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/services/cart/add',
      status: 503,
      latency,
      clientIp,
      userAgent,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestPayload: JSON.stringify({ userId, itemId, quantity }),
      responsePayload: JSON.stringify({ error: 'Service Unavailable', message: 'Cart service degraded: payment availability check failed' }),
      errorMessage: `CascadeError: payment service returned ${paymentStatus} (${paymentLatency}ms) — cart add blocked`,
    });
    return NextResponse.json(
      { error: 'Service Unavailable', message: 'Cart service degraded: dependency failure in payment service' },
      { status: 503 }
    );
  }

  // Direct cart failure (independent of payment)
  if (shouldFail(cfg.cartFailureRate)) {
    writeLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/services/cart/add',
      status: 500,
      latency,
      clientIp,
      userAgent,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestPayload: JSON.stringify({ userId, itemId, quantity }),
      responsePayload: JSON.stringify({ error: 'Internal Server Error', message: "TypeError: Cannot read properties of null (reading 'userId')" }),
      errorMessage: "TypeError: Cannot read properties of null (reading 'userId') at CartController.addItem",
    });
    return NextResponse.json(
      { error: 'Internal Server Error', message: "Unhandled exception in cart service" },
      { status: 500 }
    );
  }

  const cartId = `cart_${Math.random().toString(36).slice(2, 10)}`;
  writeLog({
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/api/services/cart/add',
    status: 201,
    latency,
    clientIp,
    userAgent,
    requestHeaders: { 'Content-Type': 'application/json' },
    requestPayload: JSON.stringify({ userId, itemId, quantity }),
    responsePayload: JSON.stringify({ success: true, cartId, itemCount: quantity }),
  });

  return NextResponse.json({ success: true, cartId, itemCount: quantity }, { status: 201 });
}

// ─── GET /api/services/cart ─── View cart
export async function GET(req: NextRequest) {
  const cfg = chaosStore.getConfig();
  const start = Date.now();
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'API-Sentinel-Simulator/1.0';

  await randomDelay([cfg.cartLatency[0] / 2, cfg.cartLatency[1] / 2]);
  const latency = Date.now() - start;

  const items = Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, i) => ({
    id: `item_${i + 1}`,
    name: ['Wireless Headphones', 'USB Hub', 'Laptop Stand', 'Mechanical Keyboard'][i % 4],
    quantity: Math.floor(Math.random() * 3) + 1,
    price: Math.floor(Math.random() * 150) + 20,
  }));

  writeLog({
    timestamp: new Date().toISOString(),
    method: 'GET',
    path: '/api/services/cart/view',
    status: 200,
    latency,
    clientIp,
    userAgent,
    requestHeaders: {},
    responsePayload: JSON.stringify({ items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) }),
  });

  return NextResponse.json({ items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) });
}
