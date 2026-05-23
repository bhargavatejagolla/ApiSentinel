import fs from 'fs';
import path from 'path';

export type ChaosScenario =
  | 'healthy'
  | 'payment_failure'
  | 'db_timeout'
  | 'auth_breach'
  | 'traffic_spike'
  | 'cascade_failure';

export interface ChaosConfig {
  scenario: ChaosScenario;
  // Failure rates (0.0 – 1.0)
  authFailureRate: number;
  paymentFailureRate: number;
  cartFailureRate: number;
  // Latency ranges in ms [min, max]
  authLatency: [number, number];
  paymentLatency: [number, number];
  cartLatency: [number, number];
  // If true: cart service calls payment and inherits its failure
  cascadeEnabled: boolean;
  // Description shown in UI
  description: string;
}

export const CHAOS_CONFIGS: Record<ChaosScenario, ChaosConfig> = {
  healthy: {
    scenario: 'healthy',
    authFailureRate: 0.02,
    paymentFailureRate: 0.04,
    cartFailureRate: 0.02,
    authLatency: [20, 120],
    paymentLatency: [30, 180],
    cartLatency: [20, 100],
    cascadeEnabled: false,
    description: 'All services healthy. Low failure rates, normal latency.',
  },
  payment_failure: {
    scenario: 'payment_failure',
    authFailureRate: 0.02,
    paymentFailureRate: 0.65,
    cartFailureRate: 0.05,
    authLatency: [20, 120],
    paymentLatency: [500, 2500],
    cartLatency: [100, 400],
    cascadeEnabled: true,
    description: 'Payment service experiencing high failure rate and elevated latency.',
  },
  db_timeout: {
    scenario: 'db_timeout',
    authFailureRate: 0.05,
    paymentFailureRate: 0.18,
    cartFailureRate: 0.12,
    authLatency: [200, 800],
    paymentLatency: [2000, 5000],
    cartLatency: [800, 2500],
    cascadeEnabled: true,
    description: 'Database connection pool exhausted. Extreme latency across all services.',
  },
  auth_breach: {
    scenario: 'auth_breach',
    authFailureRate: 0.75,
    paymentFailureRate: 0.05,
    cartFailureRate: 0.03,
    authLatency: [15, 80],
    paymentLatency: [30, 150],
    cartLatency: [20, 100],
    cascadeEnabled: false,
    description: 'Brute force attack on Auth service. 75% login rejection rate.',
  },
  traffic_spike: {
    scenario: 'traffic_spike',
    authFailureRate: 0.08,
    paymentFailureRate: 0.28,
    cartFailureRate: 0.15,
    authLatency: [50, 300],
    paymentLatency: [200, 1200],
    cartLatency: [100, 600],
    cascadeEnabled: true,
    description: 'Traffic spike overloading all services. Elevated failures across the board.',
  },
  cascade_failure: {
    scenario: 'cascade_failure',
    authFailureRate: 0.42,
    paymentFailureRate: 0.88,
    cartFailureRate: 0.75,
    authLatency: [100, 600],
    paymentLatency: [1000, 4500],
    cartLatency: [500, 3000],
    cascadeEnabled: true,
    description: 'CRITICAL: Full cascade failure. Payment down → Cart degraded → Auth overloaded.',
  },
};

// File-backed + memory-cached active scenario
const isVercel = process.env.VERCEL === '1';
const CHAOS_PATH = isVercel
  ? path.join('/tmp', 'chaos_config.json')
  : path.join(process.cwd(), '.chaos_config.json');

function loadScenario(): ChaosScenario {
  try {
    if (fs.existsSync(CHAOS_PATH)) {
      const raw = fs.readFileSync(CHAOS_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as { scenario: ChaosScenario };
      if (CHAOS_CONFIGS[parsed.scenario]) {
        return parsed.scenario;
      }
    }
  } catch {
    /* ignore */
  }
  return 'healthy';
}

function persistScenario(scenario: ChaosScenario) {
  try {
    fs.writeFileSync(CHAOS_PATH, JSON.stringify({ scenario }), 'utf-8');
  } catch {
    /* ignore */
  }
}

export const chaosStore = {
  getConfig(): ChaosConfig {
    return CHAOS_CONFIGS[loadScenario()];
  },
  getScenario(): ChaosScenario {
    return loadScenario();
  },
  setScenario(scenario: ChaosScenario) {
    if (!CHAOS_CONFIGS[scenario]) throw new Error(`Unknown scenario: ${scenario}`);
    persistScenario(scenario);
  },
};

// Helper: sleep a random ms within a [min, max] range
export function randomDelay(range: [number, number]): Promise<void> {
  const ms = Math.floor(Math.random() * (range[1] - range[0])) + range[0];
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: should this request fail based on rate?
export function shouldFail(rate: number): boolean {
  return Math.random() < rate;
}
