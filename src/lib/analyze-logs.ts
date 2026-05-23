import { getChatCompletion } from './groq';
import { logStore } from './log-store';
import { Anomaly, APILog, Prediction, CausalLink } from '../types';

export async function runAIAnomalyAnalysis(logsToAnalyzeCount: number = 75): Promise<Anomaly[]> {
  const allLogs = logStore.getLogs();
  
  if (allLogs.length === 0) {
    console.log('AnalyzeLogs: No logs available for analysis.');
    return [];
  }

  // Get the most recent logs to analyze (e.g. latest 75 logs)
  const recentLogs = allLogs.slice(-logsToAnalyzeCount);
  
  // Format logs compactly to optimize context window and tokens
  const formattedLogs = recentLogs.map(log => ({
    id: log.id,
    time: log.timestamp,
    method: log.method,
    path: log.path,
    status: log.status,
    latency: `${log.latency}ms`,
    ip: log.clientIp,
    ua: log.userAgent,
    req_pay: log.requestPayload ? log.requestPayload.substring(0, 200) : '',
    res_pay: log.responsePayload ? log.responsePayload.substring(0, 200) : '',
    err: log.errorMessage || ''
  }));

  const systemPrompt = `You are the AI Incident Commander—an elite, battle-tested Principal Site Reliability Engineer and Lead Security Architect.
Analyze the provided API logs for anomalies, performance bottlenecks, security threats, and system failures. You do not just report errors—you manage active incidents with extreme technical precision and business awareness.

Anomalies categories you must detect:
1. "security": Brute-force credentials login attacks (high frequency 401s followed by a 200 from a single IP, or endless 401s), SQL injection sweeps, vulnerability scans, malicious scanner signatures (e.g. sqlmap, python-requests, unusual curl headers), path traversal attempts, or unauthorized access patterns.
2. "performance": Significant latency bottlenecks (avg > 1s), slow database locks, 504 gateway timeouts, or cascading delays.
3. "error": Sudden spikes of 5xx errors, unhandled coding crashes, stack trace leakage, or database driver parsing errors.
4. "behavior": Data scraping patterns (high frequency GET requests sequential traversing product/resource IDs), rate-limit evaders, or abnormal volume spikes.

Analyze the logs carefully. Group related log IDs together that represent a single incident.

Additionally, perform two advanced SRE tasks:
1. **Predictive Failure Warnings**: Examine recent latency and status trends to predict possible upcoming failures *before* they happen (e.g., if latency on checkout has risen from 100ms -> 800ms -> 3000ms, predict a timeout crash). Confidence can be high, medium, or low.
2. **Causal Graph Dependency Map**: Map causal links between systems or endpoints when one failure triggers others (e.g., database pool exhaustion on '/api/v1/checkout/pay' is causing database locks that trigger failures on '/api/v1/analytics/report').

You MUST respond with a valid JSON object matching the following structure exactly. Do not include markdown codeblocks or outer text. Just the JSON:
{
  "anomalies": [
    {
      "id": "string (unique string starting with 'anm_')",
      "path": "string (the primary endpoint path affected, e.g. /api/v1/auth/login)",
      "type": "security | performance | error | behavior",
      "severity": "low | medium | high | critical",
      "summary": "string (concise 1-sentence title of the incident)",
      "explanation": "string (deep technical SRE root-cause explanation of what occurred, why it failed, and technical or infrastructure implications)",
      "mitigation": "string (markdown list of long-term fixes, secure code suggestions, WAF configs, or database schema upgrades)",
      "associatedLogIds": ["array of log IDs that triggered or are part of this anomaly"],
      "serviceAffected": "string (human-readable system name, e.g., 'Payment Gateways API', 'User Authentication Server', 'Inventory Search Service')",
      "businessImpact": "string (critical assessment of the financial or customer experience impact, e.g., 'Reduces payment checkout success rate by 32%', 'Exposes sensitive user account tables')",
      "juniorExplanation": "string (a highly simplified, super-clear explanation written as if you are explaining it to a junior developer or a non-technical manager. Use vivid metaphors or analogies!)",
      "actionChecklist": ["array of 3-4 immediate, tactical steps to recover, e.g., '1. Rollback payment-controller build', '2. Restart database pods', '3. Apply temporary IP rate limit'"],
      "estimatedRecoveryTime": "string (estimated SRE time to resolve under current recovery steps, e.g., '5-10 minutes', '15-20 minutes')"
    }
  ],
  "predictions": [
    {
      "endpoint": "string (e.g. /api/v1/checkout/pay)",
      "predictedFailureType": "timeout | crash | overload | exploit",
      "confidence": "high | medium | low",
      "reasoning": "string (concise explanation of why this failure is predicted based on current trends)"
    }
  ],
  "causal_links": [
    {
      "from": "string (service or endpoint causing the issue, e.g., 'Database Cluster' or '/api/v1/checkout/pay')",
      "to": "string (service or endpoint affected as a result, e.g., 'Inventory Service' or '/api/v1/analytics/report')",
      "label": "string (relationship description, e.g. 'exhausts connections causing cascade')"
    }
  ]
}`;

  const userPrompt = `Here are the latest API logs to analyze:
${JSON.stringify(formattedLogs, null, 2)}`;

  try {
    const rawResult = await getChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], true); // Force JSON Mode

    if (!rawResult || rawResult.trim() === '') {
      throw new Error('Received empty response from Groq LLM.');
    }

    // Parse the JSON output
    const parsedData = JSON.parse(rawResult);
    
    // Parse Anomalies
    const anomaliesList = Array.isArray(parsedData.anomalies) ? parsedData.anomalies : [];
    const detectedAnomalies: Anomaly[] = anomaliesList.map((item: any) => {
      const id = item.id || `anm_${Math.random().toString(36).substring(2, 11)}`;
      const timestamp = new Date().toISOString();
      const path = item.path || '/unknown';
      const type = ['security', 'performance', 'error', 'behavior'].includes(item.type) 
        ? item.type 
        : 'behavior';
      const severity = ['low', 'medium', 'high', 'critical'].includes(item.severity) 
        ? item.severity 
        : 'low';
      const summary = item.summary || 'Unspecified API anomaly detected';
      const explanation = item.explanation || 'No deep details provided by the AI.';
      const mitigation = item.mitigation || '* Investigate the associated logs.\n* Implement basic endpoint rate limits.';
      const associatedLogIds = Array.isArray(item.associatedLogIds) ? item.associatedLogIds : [];
      
      const serviceAffected = item.serviceAffected || 'API Microservice Gateway';
      const businessImpact = item.businessImpact || 'Potential performance degradation for API consumers.';
      const juniorExplanation = item.juniorExplanation || 'We found some abnormal queries that are running slowly. We should double check our indexes!';
      const actionChecklist = Array.isArray(item.actionChecklist) 
        ? item.actionChecklist 
        : ['1. Review standard trace data logs', '2. Verify endpoint connectivity', '3. Monitor error rates'];
      const estimatedRecoveryTime = item.estimatedRecoveryTime || '10-15 minutes';

      return {
        id,
        timestamp,
        path,
        type,
        severity,
        summary,
        explanation,
        mitigation,
        associatedLogIds,
        serviceAffected,
        businessImpact,
        juniorExplanation,
        actionChecklist,
        estimatedRecoveryTime
      };
    });

    // Parse Predictions
    const predictionsList = Array.isArray(parsedData.predictions) ? parsedData.predictions : [];
    const detectedPredictions: Prediction[] = predictionsList.map((item: any) => {
      return {
        endpoint: item.endpoint || '/api',
        predictedFailureType: ['timeout', 'crash', 'overload', 'exploit'].includes(item.predictedFailureType)
          ? item.predictedFailureType
          : 'timeout',
        confidence: ['high', 'medium', 'low'].includes(item.confidence)
          ? item.confidence
          : 'low',
        reasoning: item.reasoning || 'Unusual system load detected.',
      };
    });

    // Parse Causal Links
    const causalLinksList = Array.isArray(parsedData.causal_links) ? parsedData.causal_links : [];
    const detectedCausalLinks: CausalLink[] = causalLinksList.map((item: any) => {
      return {
        from: item.from || 'Gateway',
        to: item.to || 'Microservice',
        label: item.label || 'triggers cascading exceptions',
      };
    });

    // Update Store
    const storeData = logStore.getData();
    storeData.predictions = detectedPredictions;
    storeData.causalLinks = detectedCausalLinks;
    
    // Ingest the anomalies (which automatically saves the entire cache structure including predictions and links)
    if (detectedAnomalies.length > 0) {
      logStore.addAnomalies(detectedAnomalies);
      console.log(`AnalyzeLogs: Identified ${detectedAnomalies.length} anomalies, ${detectedPredictions.length} predictive warnings, and ${detectedCausalLinks.length} causal links.`);
    } else {
      console.log('AnalyzeLogs: AI completed analysis. No anomalies detected.');
      // Make sure we still save predictions and links even if no direct anomalies are reported
      logStore.addAnomalies([]); 
    }

    return detectedAnomalies;
  } catch (error) {
    console.error('Failed to run AI log analysis:', error);
    throw error;
  }
}
