import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion, ChatMessage } from '@/lib/groq';
import { logStore } from '@/lib/log-store';

// POST: Natural Language Q&A Chat with Lexical RAG & SRE Context Memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { question, history } = body;

    if (!question || question.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Missing "question" field.' },
        { status: 400 }
      );
    }

    const data = logStore.getData();
    
    const allLogs = data.logs || [];

    // ==========================================
    // 🧠 LEXICAL RAG LOG RETRIEVAL ENGINE
    // ==========================================
    // Tokenize user's question to scan all 1,000 logs in the database
    const cleanQuery = question.toLowerCase();
    const stopWords = new Set(['why', 'did', 'how', 'what', 'the', 'and', 'for', 'are', 'you', 'was', 'were', 'with', 'about', 'from', 'this', 'that']);
    const keywords = cleanQuery
      .split(/[^a-zA-Z0-9]/)
      .filter((word: string) => word.length > 2 && !stopWords.has(word));

    const scoredLogs = data.logs.map(log => {
      let score = 0;
      
      // Weight priority for errors, timeouts and latency spikes
      if (log.status >= 500) score += 6;
      else if (log.status >= 400) score += 3;
      if (log.errorMessage) score += 4;
      if (log.latency > 450) score += 2;

      // Lexical keyword matching
      keywords.forEach((keyword: string) => {
        if (log.path.toLowerCase().includes(keyword)) score += 8;
        if (log.method.toLowerCase() === keyword) score += 5;
        if (log.errorMessage && log.errorMessage.toLowerCase().includes(keyword)) score += 10;
        if (log.status.toString() === keyword) score += 12;
        if (log.clientIp.includes(keyword)) score += 7;
      });

      return { log, score };
    });

    // Extract relevant matching logs (up to 20 logs)
    const matchedLogs = scoredLogs
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.log)
      .slice(0, 20);

    // Grab the most recent 15 logs for baseline chronological reference
    const recentChronologicalLogs = data.logs.slice(-15);

    // Merge both lists and deduplicate by Log ID to save context tokens
    const uniqueLogsMap = new Map();
    [...matchedLogs, ...recentChronologicalLogs].forEach(log => {
      uniqueLogsMap.set(log.id, log);
    });
    const ragLogs = Array.from(uniqueLogsMap.values());

    const formattedLogsContext = ragLogs.map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString(),
      method: log.method,
      path: log.path,
      status: log.status,
      latency: `${log.latency}ms`,
      ip: log.clientIp,
      err: log.errorMessage || ''
    }));

    // ==========================================
    // 📊 GLOBAL COCKPIT CONTEXT RETRIEVAL
    // ==========================================
    const statsContext = {
      healthScore: data.stats.overallHealthScore,
      errorRate: `${data.stats.errorRate}%`,
      averageLatency: `${data.stats.averageLatency}ms`,
      p95Latency: `${data.stats.latencyP95}ms`,
      successRate: `${data.stats.successRate}%`,
      totalVolume: data.stats.totalRequests
    };

    const activeAnomalies = data.anomalies.map(a => ({
      type: a.type,
      severity: a.severity,
      summary: a.summary,
      service: a.serviceAffected,
      path: a.path,
      impact: a.businessImpact || 'N/A',
      suggestedPlaybook: a.actionChecklist || []
    }));

    const proactiveWarnings = data.predictions.map(p => ({
      endpoint: p.endpoint,
      risk: p.confidence,
      expectedOutage: p.predictedFailureType,
      reason: p.reasoning
    }));

    const dependencyMap = data.causalLinks.map(l => `${l.from} -> ${l.to} (${l.label})`);

    const systemPrompt = `You are SENTINEL — the AI Incident Commander and technical assistant for the API Sentinel platform. You are powered by Llama 3.3 70B and have complete knowledge of the platform, its architecture, and the active system state.

## WHO YOU ARE
You are a highly intelligent, conversational AI with two personas:
1. **As a friendly assistant**: When someone greets you, asks general questions, or wants to chat — you respond naturally, warmly, and helpfully. You are NOT robotic. You introduce yourself, explain what you can do, and engage naturally.
2. **As an SRE Incident Commander**: When there's a technical question or active incident — you switch to a structured, operational format with clear headers, bullet points, and action checklists.

## COMPLETE PLATFORM KNOWLEDGE — API SENTINEL
You know EVERYTHING about this platform:

**What API Sentinel Is:**
- A live AI-powered SRE (Site Reliability Engineering) and chaos engineering platform
- Built with Next.js 16, TypeScript, Llama 3.3 70B via Groq API, React, Tailwind CSS
- Monitors real API services, detects anomalies, and provides AI-driven incident management

**The 3 Real Mini-Services:**
- **/api/services/auth** — Authentication service. POST for login (returns JWT), GET for profile. Can suffer brute force attacks.
- **/api/services/cart** — Cart service. POST to add items, GET to view cart. Calls Payment internally → creates REAL cascading failures when payment is down.
- **/api/services/payment** — Payment/checkout service. This is the ROOT of cascade failures. Applies real async delays (up to 5000ms) and can return 503/504.

**The 6 Chaos Scenarios (REAL failures, not simulated):**
- ✅ **Healthy Traffic** — 2-5% failure rate, 20-150ms latency, all services nominal
- 💳 **Payment Failure** — 65% payment service 503s, 500-2500ms latency, cart cascades
- 🗄️ **DB Timeout** — 2000-5000ms REAL delays → genuine 504 timeouts, pool exhaustion
- 🔐 **Auth Breach** — 75% login rejections, brute force IP signatures, 15-80ms (attacker speed)
- 📈 **Traffic Spike** — 28% payment + 15% cart failures, system overload simulation
- 🔥 **Full Cascade Failure** — CRITICAL: 88% payment + 75% cart + 42% auth failing simultaneously

**How Traffic Simulation Works:**
- User picks a chaos scenario → clicks "Simulate Traffic"
- System calls /api/chaos to set the scenario on all services
- Then fires 15-25 REAL concurrent HTTP requests to the 3 services
- Each service applies REAL latency (actual async sleep), REAL failure rates
- Logs are captured with actual wall-clock timing (not generated)
- Dashboard updates in real-time with real error rates and latency

**Dashboard Workspaces:**
- 🚀 **COMMAND_DECK** — Health score (0-100), request volume, avg latency, P95 latency, failure rate, anomaly cards, predictions, action checklists, causal dependency graph
- 📟 **LOG_STREAM** — Real-time terminal feed of all captured API logs with status codes, latency, IPs, error messages
- 🕸️ **CASCADE_MAP (Topology)** — Circular SVG visualization of service dependencies showing how failures propagate
- 💬 **AI_COMMANDER_CHAT** — This chat! Natural language Q&A with RAG context from live logs

**AI Analysis System:**
- The "Run AI Analysis" button uses Llama 3.3 70B to scan the last 75 logs
- Automatically detects: brute force attacks, SQL injection, latency spikes, scrapers, TypeError crashes
- Generates structured anomaly reports with: severity, business impact, recovery checklist, estimated recovery time
- Triggers cascade mapping and predictive risk forecasts

**Tech Stack:**
- Frontend: Next.js 16 App Router, TypeScript, Tailwind CSS, React, SWR for polling
- Visual FX: GridScan (WebGL grid), Galaxy (Three.js star field), TrueFocus, GlitchText, Shuffle (GSAP), StarBorder
- AI: Groq API → Llama 3.3 70B Versatile
- Storage: File-backed JSON store (.api_sentinel_store.json)
- Chaos Config: .chaos_config.json (persisted across requests)

## CONVERSATION RULES

**FOR GREETINGS (Hi, Hello, Hey, Who are you, What are you, etc.):**
Respond naturally and warmly. Introduce yourself. Explain what you can do. Be friendly and engaging. Do NOT use the SRE incident format for greetings.

Example greeting response:
"Hey! I'm SENTINEL, the AI Incident Commander for API Sentinel 👋
I'm built on Llama 3.3 70B and I know this entire platform inside-out — from how the chaos scenarios generate real failures, to how the cascade mapping works, to debugging live incidents.

You can ask me anything:
• **About this platform** — how it works, what the scenarios do, what each workspace shows
• **Technical SRE questions** — incident response, microservices, latency debugging
• **Live incident analysis** — I have access to your current API logs, anomalies, and health metrics

What would you like to know?"

**FOR GENERAL / PLATFORM QUESTIONS:**
Answer naturally using your platform knowledge. Be thorough but concise. Use markdown formatting.

**FOR TECHNICAL/INCIDENT QUESTIONS:**
Use this operational format:
**Issue Detected:** [precise problem summary]
**Possible Reasons:** [bullets]
**Recommended Checks:** [numbered actions]
**Outage Prevention:** [bullets]

**ALWAYS:**
- Reference real data from the logs/anomalies/stats when available
- Remember conversation history and refer back to it naturally
- Be helpful, intelligent, and genuinely useful — not just a template-filler
- If asked about the platform, show deep knowledge — you KNOW this system`;



    const userPrompt = `Developer's Current Question: "${question}"

========= ACTIVE SRE COCKPIT DATA =========
[SLA Health Gauges]:
${JSON.stringify(statsContext, null, 2)}

[Active Outages & Incident Reports]:
${JSON.stringify(activeAnomalies, null, 2)}

[Causal Dependency Graph]:
${JSON.stringify(dependencyMap, null, 2)}

[Proactive Outage Warnings]:
${JSON.stringify(proactiveWarnings, null, 2)}

[Lexical RAG Ingested API Logs]:
${JSON.stringify(formattedLogsContext, null, 2)}
==========================================`;

    // ==========================================
    // 💬 CONSTRUCT MESSAGES DECK (THREAD MEMORY)
    // ==========================================
    const messages: ChatMessage[] = [];
    messages.push({ role: 'system', content: systemPrompt });

    // Inject chat history thread to remember previous questions/answers
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    // Append the active question and context block
    messages.push({ role: 'user', content: userPrompt });

    // Invoke Llama-3.3-70b-versatile for high-tier reasoning
    const answer = await getChatCompletion(messages, false, 'llama-3.3-70b-versatile');

    return NextResponse.json({ success: true, answer });
  } catch (error: any) {
    console.error('API Log Chat Error:', error);
    
    if (error.message && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Groq API Key configuration missing', 
          details: 'Please set the GROQ_API_KEY environment variable in your .env.local file to activate log Q&A chat operations.' 
        },
        { status: 412 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to complete logs chat analysis', details: error.message },
      { status: 500 }
    );
  }
}
