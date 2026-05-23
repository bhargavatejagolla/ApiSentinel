import fs from 'fs';
import path from 'path';
import { APILog, Anomaly, HealthStats, DashboardData, Prediction, CausalLink } from '../types';

// Determine Vercel-ready storage path
const isVercel = process.env.VERCEL === '1';
const STORE_PATH = isVercel
  ? path.join('/tmp', 'api_sentinel_store.json')
  : path.join(process.cwd(), '.api_sentinel_store.json');

// Memory cache to avoid excessive file reads in single-execution environments
let memoryCache: DashboardData | null = null;

const DEFAULT_DATA: DashboardData = {
  logs: [],
  anomalies: [],
  stats: {
    overallHealthScore: 100,
    totalRequests: 0,
    errorRate: 0,
    averageLatency: 0,
    successRate: 100,
    latencyP95: 0,
  },
  predictions: [],
  causalLinks: [],
};

// Initialize store if it doesn't exist
function initStore(): DashboardData {
  if (memoryCache) return memoryCache;

  try {
    if (fs.existsSync(STORE_PATH)) {
      const rawData = fs.readFileSync(STORE_PATH, 'utf-8');
      memoryCache = JSON.parse(rawData);
      if (!memoryCache!.predictions) memoryCache!.predictions = [];
      if (!memoryCache!.causalLinks) memoryCache!.causalLinks = [];
      return memoryCache!;
    }
  } catch (error) {
    console.error('Failed to read store file, reinitializing', error);
  }

  // Fallback to default structure
  memoryCache = { ...DEFAULT_DATA };
  saveStore(memoryCache);
  return memoryCache;
}

// Persist data
function saveStore(data: DashboardData) {
  memoryCache = data;
  try {
    // Ensure parent directory exists (needed for custom paths or /tmp)
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write to store file:', error);
  }
}

// Calculate health stats
function calculateStats(logs: APILog[], anomalies: Anomaly[]): HealthStats {
  const totalRequests = logs.length;
  if (totalRequests === 0) {
    return DEFAULT_DATA.stats;
  }

  const errorLogs = logs.filter(log => log.status >= 400);
  const errorRate = Number(((errorLogs.length / totalRequests) * 100).toFixed(1));
  const successRate = Number((100 - errorRate).toFixed(1));

  const totalLatency = logs.reduce((sum, log) => sum + log.latency, 0);
  const averageLatency = Math.round(totalLatency / totalRequests);

  // P95 Latency
  const latencies = logs.map(log => log.latency).sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const latencyP95 = latencies[p95Index] || 0;

  // Calculate Health Score (out of 100)
  // Deduct for:
  // - High error rates (e.g. 1% error rate = -2.5 points)
  // - Latency spikes (e.g. avg latency > 300ms = -0.05 points per ms)
  // - Critical/High severity anomalies in the last 50 requests
  let overallHealthScore = 100;

  // 1. Error rate impact
  overallHealthScore -= errorRate * 3.5;

  // 2. Latency impact (start penalizing above 250ms avg latency)
  if (averageLatency > 250) {
    overallHealthScore -= (averageLatency - 250) * 0.15;
  }

  // 3. Anomaly impact (anomalies in the last 100 requests)
  const recentLogsIds = new Set(logs.slice(-100).map(l => l.id));
  const activeAnomalies = anomalies.filter(anomaly => 
    anomaly.associatedLogIds.some(id => recentLogsIds.has(id))
  );

  activeAnomalies.forEach(anomaly => {
    if (anomaly.severity === 'critical') overallHealthScore -= 30;
    else if (anomaly.severity === 'high') overallHealthScore -= 15;
    else if (anomaly.severity === 'medium') overallHealthScore -= 8;
    else overallHealthScore -= 3;
  });

  // Clamp overallHealthScore between 0 and 100
  overallHealthScore = Math.max(0, Math.min(100, Math.round(overallHealthScore)));

  return {
    overallHealthScore,
    totalRequests,
    errorRate,
    averageLatency,
    successRate,
    latencyP95,
  };
}

export const logStore = {
  getLogs(): APILog[] {
    const data = initStore();
    return data.logs;
  },

  addLogs(newLogs: APILog[]): APILog[] {
    const data = initStore();
    // Add logs, capping the total log buffer in memory/file to 1000 logs
    const mergedLogs = [...data.logs, ...newLogs];
    const cappedLogs = mergedLogs.slice(-1000);

    data.logs = cappedLogs;
    data.stats = calculateStats(cappedLogs, data.anomalies);

    // ===================================================
    // 🔍 AUTOMATED SIGNATURE INCIDENT SCANNER (DEMO ENGINE)
    // ===================================================
    let detectedScenario: 'brute_force' | 'sql_injection' | 'latency_spike' | 'scraping' | 'unhandled_exceptions' | null = null;
    for (const log of newLogs) {
      if (log.path.includes('auth/login') && log.status === 401) {
        detectedScenario = 'brute_force';
        break;
      }
      if (log.path.includes('UNION') || log.path.includes('SELECT') || log.path.includes('DROP')) {
        detectedScenario = 'sql_injection';
        break;
      }
      if ((log.path.includes('checkout/pay') || log.path.includes('analytics/report')) && log.latency > 1200) {
        detectedScenario = 'latency_spike';
        break;
      }
      if (log.userAgent.includes('python-requests')) {
        detectedScenario = 'scraping';
        break;
      }
      if (log.errorMessage && log.errorMessage.includes('TypeError')) {
        detectedScenario = 'unhandled_exceptions';
        break;
      }
    }

    if (detectedScenario) {
      const hasAnomaly = data.anomalies.some(a => a.id.startsWith(`anm_sig_${detectedScenario}`));
      if (!hasAnomaly) {
        let autoAnomaly: Anomaly;
        let autoPrediction: Prediction;
        let autoCausalLink: CausalLink;
        
        switch (detectedScenario) {
          case 'brute_force':
            autoAnomaly = {
              id: 'anm_sig_brute_force',
              timestamp: new Date().toISOString(),
              path: '/api/v1/auth/login',
              type: 'security',
              severity: 'high',
              summary: '🚨 SECURITY INCIDENT DETECTED - Brute Force Credentials Login Attack Active',
              explanation: 'SRE security monitors flagged an active brute force login credentials attack targeted at /api/v1/auth/login from external IP 198.51.100.42. The traffic matches horizontal dictionary scanning signatures. On the final sequence, a successful 200 OK login session token was generated, indicating a highly probable administrative security breach.',
              mitigation: '* Apply immediate temporary IP ban to 198.51.100.42.\n* Enforce WAF rate limits of max 5 authentication attempts per IP per minute.\n* Force mandatory password reset and active multi-factor authentication (MFA) challenges on affected admin accounts.',
              associatedLogIds: newLogs.filter(l => l.path.includes('auth/login')).map(l => l.id),
              serviceAffected: 'User Authentication Server (Auth Service)',
              businessImpact: 'Exposes administrative account access, potentially compromising customer profiles, sensitive databases, and system configuration rules.',
              juniorExplanation: 'An attacker is trying to guess passwords on the login page by trying hundreds of usernames. They finally guessed a password and got in! We need to block their IP immediately and enforce lockouts so they can\'t keep guessing passwords.',
              actionChecklist: [
                '1. Ban IP address 198.51.100.42 at the Cloudflare WAF level',
                '2. Force password reset on account "admin"',
                '3. Enable rate-limiting middleware on /api/v1/auth/login',
                '4. Verify login session trace logs'
              ],
              estimatedRecoveryTime: '5-10 minutes'
            };
            autoPrediction = {
              endpoint: '/api/v1/auth/login',
              predictedFailureType: 'exploit',
              confidence: 'high',
              reasoning: 'Credential stuffing bot has successfully obtained a valid JWT session token. Direct system takeover risk active.'
            };
            autoCausalLink = {
              from: '198.51.100.42',
              to: 'Auth Service',
              label: 'horizontal credentials scan'
            };
            break;

          case 'sql_injection':
            autoAnomaly = {
              id: 'anm_sig_sql_injection',
              timestamp: new Date().toISOString(),
              path: '/api/v1/products',
              type: 'security',
              severity: 'high',
              summary: '🚨 SECURITY INCIDENT DETECTED - Database SQL Injection exploit probe active',
              explanation: 'Gateway WAF filters flagged active SQL database exploit probes containing union-select and command drop commands. 60% of requests triggered internal PostgreSQL syntax exceptions (500 Internal Server Error) leaking debug traces. The probe signature is linked to automated sqlmap scanners.',
              mitigation: '* Ensure all database queries use parameterized SQL prepared statements.\n* Apply strict input validation regex sanitization on products URL query variables.\n* Disable detailed debug stack trace printing in production output payloads.',
              associatedLogIds: newLogs.filter(l => l.path.includes('products')).map(l => l.id),
              serviceAffected: 'WAF Shield & Products database',
              businessImpact: 'Risks data leakage of core customer and catalog tables, and potential database structure deletion.',
              juniorExplanation: 'Someone is trying to run database commands by typing them directly into the products URL. Because we aren\'t sanitizing the inputs, the database is crashing and outputting developer debugging notes! We need to sanitize the inputs so they are treated as text, not code.',
              actionChecklist: [
                '1. Refactor query to use Postgres parameterized prepared statements',
                '2. Block requests containing "UNION" or ";" at the WAF level',
                '3. Disable debug stack trace printing in production output responses',
                '4. Restart product service container'
              ],
              estimatedRecoveryTime: '10-15 minutes'
            };
            autoPrediction = {
              endpoint: '/api/v1/products',
              predictedFailureType: 'exploit',
              confidence: 'medium',
              reasoning: 'Raw query exceptions are causing database connection leaks. Continuous scanning will trigger database connection depletion.'
            };
            autoCausalLink = {
              from: '185.190.140.23',
              to: 'Products Database',
              label: 'SQL injection crash probes'
            };
            break;

          case 'latency_spike':
            autoAnomaly = {
              id: 'anm_sig_latency_spike',
              timestamp: new Date().toISOString(),
              path: '/api/v1/checkout/pay',
              type: 'performance',
              severity: 'critical',
              summary: '🚨 CRITICAL INCIDENT DETECTED - Checkout pay API latency surge & timeout cascade',
              explanation: 'SRE monitoring detected an extreme latency spike where /api/v1/checkout/pay average response time surged past 3200ms, causing cascading 504 gateway timeouts. This backlog is exhausting the database connection pool, starving analytical analytics queries and cart updates concurrently.',
              mitigation: '* Increase database connection pool size limits to prevent starvation.\n* Implement a circuit breaker on /api/v1/checkout/pay to fail-fast during slow processing loops.\n* Refactor analytical queries to read from a secondary database replica.',
              associatedLogIds: newLogs.filter(l => l.path.includes('checkout') || l.path.includes('analytics')).map(l => l.id),
              serviceAffected: 'Payment API & Analytics Gateway',
              businessImpact: 'Halts payment checkout processing, degrading customer transactions by 32% and triggering immediate cart abandons.',
              juniorExplanation: 'Our payment processing server is taking over 3 seconds to process orders! Because it is holding all our database connections, other pages like reporting are starving and timing out. We need to increase our connection limit and add circuit breakers so it fails-fast rather than locking everything up.',
              actionChecklist: [
                '1. Increase Postgres database connection pool limits from 20 to 120',
                '2. Restart checkout and payment-service pods',
                '3. Activate circuit-breaker fallbacks for payment gateway requests',
                '4. Scale payment microservice replicas to 3'
              ],
              estimatedRecoveryTime: '5-10 minutes'
            };
            autoPrediction = {
              endpoint: '/api/v1/checkout/pay',
              predictedFailureType: 'timeout',
              confidence: 'high',
              reasoning: 'High latency and gateway timeouts are exhausting database pool threads, predicting cascading timeouts on cart operations.'
            };
            autoCausalLink = {
              from: 'Payment API',
              to: 'Database Pool',
              label: 'exhausts connections causing cascade'
            };
            break;

          case 'scraping':
            autoAnomaly = {
              id: 'anm_sig_scraping',
              timestamp: new Date().toISOString(),
              path: '/api/v1/products',
              type: 'behavior',
              severity: 'medium',
              summary: '🚨 PERFORMANCE INCIDENT DETECTED - Sequential product catalog web scraper sweeping inventory',
              explanation: 'System telemetry captured high frequency sequential product catalog scraping targeted at /api/v1/products/[id] from python-requests/2.31.0. This automated scanning bypasses standard user navigation, inflating catalog database traffic.',
              mitigation: '* Implement request rate-limits per IP address using Redis token buckets.\n* Inject CAPTCHA challenges for clients executing excessive requests.\n* Configure WAF to block default python-requests user-agent strings.',
              associatedLogIds: newLogs.filter(l => l.userAgent.includes('python')).map(l => l.id),
              serviceAffected: 'Products Catalog API',
              businessImpact: 'Spikes CPU compute overhead on products service and leaks competitive pricing lists.',
              juniorExplanation: 'A bot is downloading all our product catalog pricing by looping through product IDs! It is wasting our CPU. We should block their user-agent and add rate-limiting so they can only scrape slowly.',
              actionChecklist: [
                '1. Block default "python-requests" user-agent string at the WAF',
                '2. Enforce Redis token-bucket rate limits per client IP',
                '3. Inject CAPTCHA verification challenges for high frequency sweeps',
                '4. Monitor product catalog response latencies'
              ],
              estimatedRecoveryTime: '10-15 minutes'
            };
            autoPrediction = {
              endpoint: '/api/v1/products',
              predictedFailureType: 'overload',
              confidence: 'low',
              reasoning: 'Scraper is consuming catalog database resources. Continued traffic will cause catalog latency spikes.'
            };
            autoCausalLink = {
              from: '93.184.216.34',
              to: '/api/v1/products',
              label: 'sequential inventory scraper'
            };
            break;

          case 'unhandled_exceptions':
          default:
            autoAnomaly = {
              id: 'anm_sig_unhandled_exceptions',
              timestamp: new Date().toISOString(),
              path: '/api/v1/cart',
              type: 'error',
              severity: 'critical',
              summary: '🚨 CRITICAL INCIDENT DETECTED - Unhandled TypeError application crash in cart updates',
              explanation: 'AI diagnosed a fatal runtime TypeError exception on POST /api/v1/cart returning 500 Internal Server Error. The crash payload reads: "Cannot read properties of null (reading userId)". Because there is no try-catch boundary, this unhandled compiler exception halts 100% of shopping cart updates.',
              mitigation: '* Add strict null-coalescing validation checks on the userId query parameter.\n* Refactor cart route handlers with global try-catch blocks to return standardized JSON error messages.\n* Write comprehensive integration tests for edge cases with empty headers.',
              associatedLogIds: newLogs.filter(l => l.path.includes('cart') && l.status === 500).map(l => l.id),
              serviceAffected: 'Cart & Checkout Services',
              businessImpact: 'Completely blocks users from adding items to their shopping carts, halting 100% of organic purchase flows.',
              juniorExplanation: 'Our shopping cart page has a coding bug! When the system tries to look up the user\'s ID, it finds "null" instead and completely crashes the server. Because there\'s no error handler, the user gets a ugly 500 error and can\'t add anything to their cart. We need to patch the code to check if the user exists first!',
              actionChecklist: [
                '1. Rollback latest cart deployment build',
                '2. Apply hotfix patch checking for null userId in cart.ts',
                '3. Restart cart and gateway microservice pods',
                '4. Run cart automated integration tests'
              ],
              estimatedRecoveryTime: '5-10 minutes'
            };
            autoPrediction = {
              endpoint: '/api/v1/cart',
              predictedFailureType: 'crash',
              confidence: 'high',
              reasoning: 'TypeError crash blocks 100% of shopping cart updates. High impact customer lockout active.'
            };
            autoCausalLink = {
              from: '/api/v1/cart',
              to: 'Cart Service',
              label: 'TypeError compiler crash'
            };
            break;
        }

        // Add anomaly, prediction, and causality linkage to database caches
        data.anomalies = [autoAnomaly, ...data.anomalies].slice(0, 100);
        data.predictions = [autoPrediction, ...data.predictions];
        data.causalLinks = [autoCausalLink, ...data.causalLinks];
      }
    }

    // ===================================================
    // 🚨 THRESHOLD VIOLATION SLA TRIGGER (AUTO INCIDENT)
    // ===================================================
    if (data.stats.errorRate > 5.0) {
      const hasActiveBreach = data.anomalies.some(a => a.summary.includes('SLA Breach') || a.severity === 'critical');
      if (!hasActiveBreach) {
        const autoSlaAnomaly: Anomaly = {
          id: `anm_auto_sla_${Date.now()}`,
          timestamp: new Date().toISOString(),
          path: '/api/v1/checkout/pay',
          type: 'error',
          severity: 'critical',
          summary: `🚨 CRITICAL INCIDENT DETECTED - API Failure Rate SLA Breach (${data.stats.errorRate}%)`,
          explanation: `Automated SRE Diagnostic Agent has flagged an active SLA breach. Current API failure rate has surged to ${data.stats.errorRate}%, which severely violates the maximum allowed 5.0% error threshold. Upstream response latencies have spiked, indicating gateway exhaustion or unhandled database locks.`,
          mitigation: '* Scale service container replicas horizontally to distribute load.\n* Restart the microservice gateway pods.\n* Rollback the latest deployment build.',
          associatedLogIds: cappedLogs.filter(l => l.status >= 400).slice(-10).map(l => l.id),
          serviceAffected: 'Payment API & Cart Services',
          businessImpact: 'Checkout and purchase workflows are degraded, locking out active customers and reducing transactional billing processing capabilities.',
          juniorExplanation: 'Oh no! Our server error rate is higher than 5%! This means our customers are seeing error messages on our site. SRE is on it: we need to restart our servers, add more server replicas to balance the traffic, and roll back our latest code update if that caused the bug.',
          actionChecklist: [
            '1. Restart the payment-service and cart-service pods',
            '2. Scale API container replicas horizontally to 3',
            '3. Rollback the latest deployment build',
            '4. Apply WAF IP rate limits'
          ],
          estimatedRecoveryTime: '5-10 minutes'
        };

        const autoSlaPrediction: Prediction = {
          endpoint: '/api/v1/checkout/pay',
          predictedFailureType: 'timeout',
          confidence: 'high',
          reasoning: `Failure rate of ${data.stats.errorRate}% will completely exhaust the downstream gateway connection pools, triggering absolute page lockouts.`
        };

        const autoSlaCausalLink: CausalLink = {
          from: 'Payment API',
          to: 'Cart Service',
          label: 'cascading gateway timeouts'
        };

        data.anomalies = [autoSlaAnomaly, ...data.anomalies].slice(0, 100);
        data.predictions = [autoSlaPrediction, ...data.predictions];
        data.causalLinks = [autoSlaCausalLink, ...data.causalLinks];
      }
    }

    // Recalculate stats with the newly injected/synthesized anomalies so cockpit score reacts instantly!
    data.stats = calculateStats(cappedLogs, data.anomalies);
    saveStore(data);
    return cappedLogs;
  },

  getAnomalies(): Anomaly[] {
    const data = initStore();
    return data.anomalies;
  },

  addAnomalies(newAnomalies: Anomaly[]): Anomaly[] {
    const data = initStore();
    
    // Deduplicate anomalies by checking if we already have an anomaly with similar details or IDs
    const existingIds = new Set(data.anomalies.map(a => a.id));
    const uniqueNewAnomalies = newAnomalies.filter(a => !existingIds.has(a.id));

    data.anomalies = [...uniqueNewAnomalies, ...data.anomalies].slice(0, 100); // Cap at 100 anomalies
    data.stats = calculateStats(data.logs, data.anomalies);
    saveStore(data);
    return data.anomalies;
  },

  getStats(): HealthStats {
    const data = initStore();
    return data.stats;
  },

  getData(): DashboardData {
    return initStore();
  },

  clearAll(): void {
    const freshData = {
      logs: [],
      anomalies: [],
      stats: {
        overallHealthScore: 100,
        totalRequests: 0,
        errorRate: 0,
        averageLatency: 0,
        successRate: 100,
        latencyP95: 0,
      },
      predictions: [],
      causalLinks: [],
    };
    saveStore(freshData);
  }
};
