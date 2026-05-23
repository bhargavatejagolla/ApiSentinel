export interface APILog {
  id: string;
  timestamp: string; // ISO string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  status: number;
  latency: number; // in milliseconds
  clientIp: string;
  userAgent: string;
  requestHeaders?: Record<string, string>;
  requestPayload?: string; // serialized JSON or query string
  responsePayload?: string; // serialized JSON or error string
  errorMessage?: string;
}

export interface Anomaly {
  id: string;
  timestamp: string; // ISO string
  path: string;
  type: 'security' | 'performance' | 'error' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  explanation: string;
  mitigation: string;
  associatedLogIds: string[]; // List of logs that triggered this anomaly
  serviceAffected: string;
  businessImpact: string;
  juniorExplanation: string;
  actionChecklist: string[];
  estimatedRecoveryTime: string;
}

export interface HealthStats {
  overallHealthScore: number; // 0 to 100
  totalRequests: number;
  errorRate: number; // percentage (e.g. 2.5)
  averageLatency: number; // in ms
  successRate: number; // percentage
  latencyP95: number; // 95th percentile latency in ms
}

export interface Prediction {
  endpoint: string;
  predictedFailureType: 'timeout' | 'crash' | 'overload' | 'exploit';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface CausalLink {
  from: string; // affected microservice or endpoint
  to: string; // affected microservice or endpoint
  label: string; // dynamic relationship description, e.g. "triggers payment timeout"
}

export interface DashboardData {
  logs: APILog[];
  anomalies: Anomaly[];
  stats: HealthStats;
  predictions: Prediction[];
  causalLinks: CausalLink[];
}
