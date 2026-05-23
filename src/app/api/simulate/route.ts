import { NextRequest, NextResponse } from 'next/server';
import { chaosStore } from '@/lib/chaos-store';

interface SimResult {
  service: string;
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

// POST /api/simulate — Fire REAL concurrent requests to our 3 mini-services
// The services themselves write to log-store, so we just collect summary stats
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(typeof body.count === 'number' ? body.count : 15, 40);
    let origin = req.nextUrl.origin;
    if (origin.includes('localhost')) {
      origin = origin.replace('localhost', '127.0.0.1');
    }

    const cfg = chaosStore.getConfig();
    const results: SimResult[] = [];

    // Build a mixed-traffic request queue
    const requests: Array<() => Promise<SimResult>> = [];

    for (let i = 0; i < count; i++) {
      const r = Math.random();

      if (r < 0.30) {
        // 30% Auth login attempts
        requests.push(() => fireRequest(origin, 'POST', '/api/services/auth', 'Auth', 'POST /login', {
          username: ['admin', 'user', 'alice', 'bob'][Math.floor(Math.random() * 4)],
          password: Math.random().toString(36).slice(2, 10),
        }));
      } else if (r < 0.50) {
        // 20% Auth profile checks
        requests.push(() => fireRequest(origin, 'GET', '/api/services/auth', 'Auth', 'GET /profile', null, {
          Authorization: `Bearer jwt_${Math.random().toString(36).slice(2, 18)}`,
        }));
      } else if (r < 0.75) {
        // 25% Cart add item
        requests.push(() => fireRequest(origin, 'POST', '/api/services/cart', 'Cart', 'POST /add', {
          userId: `usr_${Math.random().toString(36).slice(2, 8)}`,
          itemId: `item_${Math.floor(Math.random() * 999) + 1}`,
          quantity: Math.floor(Math.random() * 3) + 1,
        }));
      } else if (r < 0.85) {
        // 10% Cart view
        requests.push(() => fireRequest(origin, 'GET', '/api/services/cart', 'Cart', 'GET /view'));
      } else {
        // 15% Payment checkout (most interesting — root of failures)
        requests.push(() => fireRequest(origin, 'POST', '/api/services/payment', 'Payment', 'POST /checkout', {
          orderId: `ord_${Math.random().toString(36).slice(2, 9)}`,
          amount: Math.floor(Math.random() * 200) + 10,
        }));
      }
    }

    // Fire all requests concurrently — real parallelism, real load
    const settled = await Promise.allSettled(requests.map(fn => fn()));

    settled.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          service: 'unknown',
          endpoint: 'unknown',
          method: 'unknown',
          status: 0,
          latencyMs: 0,
          success: false,
          error: result.reason?.message || 'Request failed',
        });
      }
    });

    // Compute summary stats from real results
    const totalRequests = results.length;
    const successCount = results.filter(r => r.success).length;
    const errorCount = totalRequests - successCount;
    const avgLatency = Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / totalRequests);
    const maxLatency = Math.max(...results.map(r => r.latencyMs));
    const errorRate = Number(((errorCount / totalRequests) * 100).toFixed(1));

    const serviceBreakdown = ['Auth', 'Cart', 'Payment'].map(svc => {
      const svcResults = results.filter(r => r.service === svc);
      const svcErrors = svcResults.filter(r => !r.success);
      return {
        service: svc,
        total: svcResults.length,
        errors: svcErrors.length,
        avgLatency: svcResults.length > 0
          ? Math.round(svcResults.reduce((s, r) => s + r.latencyMs, 0) / svcResults.length)
          : 0,
      };
    });

    return NextResponse.json({
      success: true,
      scenario: cfg.scenario,
      summary: {
        totalRequests,
        successCount,
        errorCount,
        errorRate,
        avgLatency,
        maxLatency,
      },
      serviceBreakdown,
      message: `Simulated ${totalRequests} real API requests under "${cfg.scenario}" chaos scenario. ${errorCount} errors, avg ${avgLatency}ms latency.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function fireRequest(
  origin: string,
  method: 'GET' | 'POST',
  path: string,
  service: string,
  endpoint: string,
  body?: Record<string, unknown> | null,
  extraHeaders?: Record<string, string>
): Promise<SimResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${origin}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Sentinel-Simulator/1.0',
        ...extraHeaders,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - start;
    return {
      service,
      endpoint,
      method,
      status: res.status,
      latencyMs,
      success: res.status < 400,
    };
  } catch (err: any) {
    return {
      service,
      endpoint,
      method,
      status: 0,
      latencyMs: Date.now() - start,
      success: false,
      error: err.message,
    };
  }
}
