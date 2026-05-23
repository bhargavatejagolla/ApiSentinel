import { APILog } from '../types';

type TrafficScenario = 'standard' | 'brute_force' | 'sql_injection' | 'latency_spike' | 'scraping' | 'unhandled_exceptions';

const ENDPOINTS = [
  { path: '/api/v1/products', methods: ['GET'] },
  { path: '/api/v1/user/profile', methods: ['GET', 'PUT'] },
  { path: '/api/v1/cart', methods: ['GET', 'POST', 'DELETE'] },
  { path: '/api/v1/auth/login', methods: ['POST'] },
  { path: '/api/v1/analytics/report', methods: ['GET'] },
  { path: '/api/v1/checkout/pay', methods: ['POST'] },
  { path: '/api/v1/search', methods: ['GET', 'POST'] },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'curl/8.4.0',
];

const IPS = [
  '192.168.1.100', '203.0.113.12', '198.51.100.42', '185.190.140.23', '93.184.216.34', '172.56.21.89', '45.79.19.200'
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Generate logs programmatically based on scenario
export function generateScenarioLogs(scenario: TrafficScenario, count: number): APILog[] {
  const logs: APILog[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // stagger timestamps back in time (e.g. i seconds or minutes ago)
    const timestamp = new Date(now.getTime() - (count - i) * 3000).toISOString();
    const id = `log_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString().slice(-4)}`;

    let method: APILog['method'] = 'GET';
    let path = '/api/v1/products';
    let status = 200;
    let latency = Math.floor(Math.random() * 80) + 20; // 20-100ms default
    let clientIp = getRandomItem(IPS);
    let userAgent = getRandomItem(USER_AGENTS);
    let requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    let requestPayload = '';
    let responsePayload = '';
    let errorMessage = '';

    switch (scenario) {
      case 'standard': {
        const endpoint = getRandomItem(ENDPOINTS.filter(e => e.path !== '/api/v1/checkout/pay' && e.path !== '/api/v1/auth/login'));
        path = endpoint.path;
        method = getRandomItem(endpoint.methods) as APILog['method'];
        
        // Occasional minor validation errors or client-side issues (2% of requests)
        if (Math.random() < 0.02) {
          status = 400;
          responsePayload = JSON.stringify({ error: 'Bad Request', message: 'Missing or invalid parameter: query' });
        } else {
          status = getRandomItem([200, 200, 200, 201]);
          responsePayload = JSON.stringify({ success: true, data: { count: Math.floor(Math.random() * 10) } });
        }
        break;
      }

      case 'brute_force': {
        // High frequency failed logins from a single suspicious IP
        path = '/api/v1/auth/login';
        method = 'POST';
        clientIp = '198.51.100.42'; // Dedicated attacker IP
        userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0'; // Attacker user agent
        requestHeaders['X-Requested-With'] = 'XMLHttpRequest';
        
        const usernames = ['admin', 'administrator', 'root', 'support', 'billing', 'dbadmin', 'guest'];
        const attemptedUser = i === count - 1 ? 'admin' : getRandomItem(usernames); // Last attempt might succeed

        requestPayload = JSON.stringify({ username: attemptedUser, password: `pass_${Math.random().toString(36).substring(2, 8)}` });

        // Simulate a successful breach on the very last attempt of a big burst, otherwise all 401s
        if (i === count - 1 && count >= 8) {
          status = 200;
          responsePayload = JSON.stringify({ success: true, token: 'jwt_session_token_38c92bdf8a1' });
        } else {
          status = 401;
          responsePayload = JSON.stringify({ error: 'Unauthorized', message: 'Invalid username or password' });
        }
        latency = Math.floor(Math.random() * 25) + 15; // Quick response
        break;
      }

      case 'sql_injection': {
        // Attempting injection vulnerabilities
        path = '/api/v1/products';
        method = 'GET';
        clientIp = '185.190.140.23'; // Attacker proxy IP
        userAgent = 'sqlmap/1.7.11#stable (https://sqlmap.org)'; // Vulnerability tool signature
        
        const injections = [
          "1' OR 1=1 --",
          "1' UNION SELECT username, password FROM users --",
          "1; DROP TABLE products; --",
          "1' OR 'a'='a",
          "1' AND 5621=5621 AND 'abcd'='abcd"
        ];
        const attempt = getRandomItem(injections);
        path = `/api/v1/products?id=${encodeURIComponent(attempt)}`;
        
        // 50% chance of SQL parser crash (500), 50% blocked or handled gracefully (400/403)
        if (Math.random() < 0.6) {
          status = 500;
          errorMessage = 'Uncaught DBError: SQLSTATE[42000]: Syntax error or access violation';
          responsePayload = JSON.stringify({ 
            error: 'Internal Server Error', 
            details: 'An unexpected database error occurred while parsing your request.',
            debugTrace: `at QueryBuilder.execute (db/postgres.ts:142)\nat Route.handler (app/api/v1/products/route.ts:24)` 
          });
        } else {
          status = 400;
          responsePayload = JSON.stringify({ error: 'Bad Request', message: 'SQL Injection detected and blocked by WAF filters.' });
        }
        latency = Math.floor(Math.random() * 300) + 100; // Database overhead
        break;
      }

      case 'latency_spike': {
        // Performance bottleneck on database checkout or analytics queries
        const en = getRandomItem([{ path: '/api/v1/checkout/pay', method: 'POST' as const }, { path: '/api/v1/analytics/report', method: 'GET' as const }]);
        path = en.path;
        method = en.method;
        
        // 80% chance of extreme response delay, 20% timeout (504)
        if (Math.random() < 0.2) {
          status = 504;
          latency = Math.floor(Math.random() * 1500) + 5000; // 5000ms - 6500ms
          responsePayload = JSON.stringify({ error: 'Gateway Timeout', message: 'The upstream server failed to respond in time.' });
        } else {
          status = 200;
          latency = Math.floor(Math.random() * 2000) + 1200; // 1200ms - 3200ms
          responsePayload = JSON.stringify({ success: true, receiptId: `rec_${Math.random().toString(36).substring(2, 9)}`, processingTimeMs: latency });
        }
        break;
      }

      case 'scraping': {
        // High volume requests sequentially traversing product IDs from a single Python client
        method = 'GET';
        clientIp = '93.184.216.34';
        userAgent = 'python-requests/2.31.0'; // Scraping script signature
        
        const productId = Math.floor(Math.random() * 1000) + 100;
        path = `/api/v1/products/${productId}`;
        
        status = 200;
        responsePayload = JSON.stringify({ id: productId, sku: `PROD-${productId}`, price: Math.floor(Math.random() * 499) + 5, inStock: true });
        latency = Math.floor(Math.random() * 15) + 5; // Very quick responses
        break;
      }

      case 'unhandled_exceptions': {
        // Internal coding exceptions (e.g. NullPointer, undefined variable reference)
        path = '/api/v1/cart';
        method = 'POST';
        requestPayload = JSON.stringify({ itemId: null, quantity: 'infinite' });
        
        status = 500;
        errorMessage = 'TypeError: Cannot read properties of null (reading \'userId\')';
        responsePayload = JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'An unhandled exception occurred in the application layer.',
          stack: `TypeError: Cannot read properties of null (reading 'userId')\n    at CartController.addItem (controllers/cart.ts:18:24)\n    at Route.handler (app/api/v1/cart/route.ts:42:15)`
        });
        latency = Math.floor(Math.random() * 60) + 10;
        break;
      }
    }

    logs.push({
      id,
      timestamp,
      method,
      path,
      status,
      latency,
      clientIp,
      userAgent,
      requestHeaders,
      requestPayload,
      responsePayload,
      errorMessage: errorMessage || undefined
    });
  }

  return logs;
}

// Perform active POST request ingestion to /api/logs
export async function triggerAndPostLogs(scenario: TrafficScenario, count: number, originUrl: string): Promise<APILog[]> {
  const generatedLogs = generateScenarioLogs(scenario, count);
  const ingestEndpoint = `${originUrl}/api/logs`;

  console.log(`LogGenerator: POSTing ${generatedLogs.length} logs of scenario "${scenario}" to ${ingestEndpoint}`);

  try {
    const response = await fetch(ingestEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: generatedLogs }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ingest request failed [${response.status}]: ${errorText}`);
    }

    return generatedLogs;
  } catch (error) {
    console.error('LogGenerator failed to POST logs directly. Falling back to local store injection.', error);
    // In case the loopback network fetch fails, we throw an error so the route knows
    throw error;
  }
}
