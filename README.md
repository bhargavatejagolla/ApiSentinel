<div align="center">
  <img src="https://img.shields.io/badge/API-Sentinel-8A2BE2?style=for-the-badge&logo=rocket&logoColor=white" alt="API Sentinel Banner" />
  <h1 align="center">API Sentinel — AI Incident Commander</h1>

  <p align="center">
    <strong>Detect, Diagnose, and Resolve API Failures in Real-Time</strong>
    <br />
    <i>An advanced SRE and DevOps cockpit designed to trace cascading failures, forecast outages, and provide instantaneous AI-powered remediation.</i>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/AI_Powered-FF6B6B?style=for-the-badge&logo=openai&logoColor=white" alt="AI Powered" />
    <img src="https://img.shields.io/badge/Llama_3.3-4B0082?style=for-the-badge&logo=meta&logoColor=white" alt="Llama 3" />
  </p>

  <p align="center">
    <b>Crafted with ❤️ by Golla Bhargava Teja</b>
  </p>
</div>

<br />

## 🚀 Overview

**API Sentinel** is a state-of-the-art Incident Management and SRE (Site Reliability Engineering) platform. It provides an immersive, interactive dashboard that allows developers and operators to monitor infrastructure health, simulate chaos engineering scenarios, and leverage a grounded AI Co-Pilot to automatically troubleshoot complex microservice failures.

Say goodbye to endlessly scanning terminal logs and complex tracing dashboards. API Sentinel brings **predictive analysis** and **natural language root-cause diagnosis** right to your fingertips.

---

## ✨ Core Workspaces

### 🚀 COMMAND_DECK
Your primary observation post. Features real-time statistical gauges, predictive risk forecasts, automated incident ledgers, and recovery checklists. Instantly know if your system is nominal, degraded, or experiencing a critical outage.

### 📟 LOG_STREAM
A high-density lexical terminal feed displaying live API requests. Watch incoming traffic, monitor latency spikes, and inspect headers/payloads directly as they happen.

### 🕸️ CASCADE_MAP
A dynamic microservices topology visualization. When things break, the Cascade Map dynamically traces failure propagation paths, instantly highlighting the root-cause vector (e.g., database locks causing upstream gateway timeouts).

### 💬 AI_COMMANDER_CHAT
Your grounded, operational SRE assistant. Ask plain-English troubleshooting questions about your logs and system health, and receive precise remediation actions backed by Llama 3.3. 

---

## ⚡ Chaos Engineering Engine

Test your resilience before real users do. API Sentinel comes with an integrated Chaos Engineering suite allowing you to safely inject attack scenarios and monitor how your system reacts:

- ✅ **Healthy Traffic**: All systems running nominally.
- 💳 **Payment Failure**: Simulates checkout failures and traces the cascade effect.
- 🗄️ **DB Timeout**: Simulates severe database starvation and connection pool exhaustion.
- 🔐 **Auth Breach**: Models a brute-force credential attack, generating rapid 401 rejections.
- 📈 **Traffic Spike**: Simulates extreme load, overwhelming endpoints.
- 🔥 **Full Cascade Failure**: A critical scenario where payment, cart, and auth sequentially crash.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & WebGL Shaders
- **Language**: TypeScript
- **AI Integration**: Custom RAG pipeline powered by **Groq / Llama 3.3 70B**
- **State Management**: SWR for ultra-fast, real-time client synchronization

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- `pnpm` (or `npm`/`yarn`)
- A valid Groq API Key (for the AI Commander)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bhargavatejagolla/ApiSentinel.git
   cd ApiSentinel/api-debug-agent
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory and add your AI credentials:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Run the Development Server**
   ```bash
   pnpm dev
   ```

5. **Engage the Dashboard**
   Open your browser and navigate to `http://localhost:3000`. Click **INTRUDE COCKPIT CONTROL** to launch the terminal!

---

## 💡 Usage

1. Open the **API Sentinel Dashboard**.
2. Select a **Chaos Scenario** from the top control bar (e.g., *DB Timeout*).
3. Click **Simulate Traffic** to dispatch concurrent requests against the internal APIs.
4. Watch the **Command Deck** instantly update with live SLA metrics and predictive outage warnings.
5. If an anomaly is detected, click **Run AI Agent** to automatically diagnose the root cause and generate a mitigation checklist.
6. Open the **AI Commander Chat** workspace to ask custom follow-up questions about the incident.

---

## 👨‍💻 Author

**Golla Bhargava Teja**  
Passionate about System Architecture, Site Reliability Engineering, and Building AI-Augmented Developer Tools.

<div align="center">
  <sub>API Sentinel v1.2 — Systems Nominal</sub>
</div>
