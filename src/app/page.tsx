'use client';

import React, { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { LogStream } from '@/components/dashboard/log-stream';
import { AnomalyCard } from '@/components/dashboard/anomaly-card';
import { HealthIndicator } from '@/components/dashboard/health-indicator';
import { AlertTimeline } from '@/components/dashboard/alert-timeline';
import { ExplanationSheet } from '@/components/dashboard/explanation-sheet';
import { CausalGraph } from '@/components/dashboard/causal-graph';
import Galaxy from '@/components/dashboard/Galaxy';
import TrueFocus from '@/components/dashboard/TrueFocus';
import GlitchText from '@/components/dashboard/GlitchText';
import StarBorder from '@/components/dashboard/StarBorder';
import { GridScan } from '@/components/dashboard/GridScan';
import Shuffle from '@/components/dashboard/Shuffle';
import { APILog, Anomaly, Prediction, CausalLink } from '@/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ChatMessageEntry {
  sender: 'user' | 'commander';
  text: string;
  timestamp: string;
}

export default function Home() {
  const { data, error, mutate } = useSWR<{
    success: boolean;
    logs: APILog[];
    anomalies: Anomaly[];
    stats: any;
    predictions: Prediction[];
    causalLinks: CausalLink[];
  }>('/api/logs', fetcher, {
    refreshInterval: 3000, // Refresh dashboard data every 3s
  });

  // Chaos Engineering Types
  type ChaosScenario = 'healthy' | 'payment_failure' | 'db_timeout' | 'auth_breach' | 'traffic_spike' | 'cascade_failure';
  interface SimSummary { totalRequests: number; successCount: number; errorCount: number; errorRate: number; avgLatency: number; maxLatency: number; }

  const [showLanding, setShowLanding] = useState(true);
  const [selectedLog, setSelectedLog] = useState<APILog | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ChaosScenario>('healthy');
  const [lastSimResult, setLastSimResult] = useState<SimSummary | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modular Workspace Navigation Tab
  const [activeWorkspace, setActiveWorkspace] = useState<'deck' | 'terminal' | 'topology' | 'chat'>('deck');

  // Co-Pilot Chat Console states
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessageEntry[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat history console
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Trigger toast alert
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─── Core simulation runner (used by both button click and auto-scenario-change) ───
  const runSimulation = async (scenario: ChaosScenario) => {
    setIsGenerating(true);
    showToast(`⚡ "${scenario}" — clearing logs & firing real API requests...`, 'info');
    try {
      // Step 0: Clear old logs so stale "healthy" data doesn't persist
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      });

      // Step 1: Set chaos scenario on all real services
      const chaosRes = await fetch('/api/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (!chaosRes.ok) throw new Error('Failed to set chaos scenario');

      // Step 2: Fire real concurrent traffic to Auth/Cart/Payment services
      const count = scenario === 'cascade_failure' ? 22 : scenario === 'traffic_spike' ? 25 : 16;
      const simRes = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const result = await simRes.json();

      if (result.success) {
        setLastSimResult(result.summary);
        const s = result.summary;
        showToast(
          `✅ ${s.totalRequests} real requests · ${s.errorRate}% errors · avg ${s.avgLatency}ms`,
          s.errorRate > 20 ? 'error' : s.errorRate > 5 ? 'info' : 'success'
        );
        // Mutate immediately, then again after 600ms to catch file-write sync
        mutate();
        setTimeout(() => mutate(), 600);
      } else {
        throw new Error(result.error || 'Simulation failed');
      }
    } catch (err: any) {
      showToast(err.message || 'Real traffic simulation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 1. Button click handler — runs simulation with current scenario
  const handleGenerateTraffic = () => runSimulation(activeScenario);

  // 2. Trigger AI Commander Diagnostic Analysis
  const handleRunAIAnalysis = async () => {
    setIsAnalyzing(true);
    showToast('AI Commander is scanning logs, tracing database locks, and mapping topology...', 'info');
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 75 }),
      });
      const result = await res.json();
      
      if (result.success) {
        if (result.anomaliesCount > 0) {
          showToast(`Sweep complete! Identified ${result.anomaliesCount} anomalies and updated predictive maps!`, 'success');
        } else {
          showToast('Sweep complete! All nodes operationally standard.', 'success');
        }
        mutate();
      } else {
        throw new Error(result.error || 'AI Commander analysis failed');
      }
    } catch (err: any) {
      showToast(err.message || 'AI Anomaly scan failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Natural Language Troubleshoot Chat
  const handleConsultChat = async (questionText: string) => {
    if (questionText.trim() === '') return;

    // Add user message to history
    const userMsg: ChatMessageEntry = {
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, userMsg]);
    setChatQuestion('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: questionText,
          history: chatHistory.map(h => ({
            role: h.sender === 'user' ? 'user' : 'assistant',
            content: h.text
          }))
        }),
      });
      const result = await res.json();

      if (result.success) {
        const commanderMsg: ChatMessageEntry = {
          sender: 'commander',
          text: result.answer,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistory(prev => [...prev, commanderMsg]);
      } else {
        throw new Error(result.error || 'Failed to complete logs search');
      }
    } catch (err: any) {
      const errorMsg: ChatMessageEntry = {
        sender: 'commander',
        text: `❌ Failure to consult SRE Incident Commander: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 4. Clear Log Buffer
  const handleClearBuffer = async () => {
    if (!confirm('Are you sure you want to flush all ingested logs and anomaly records from the debugger?')) return;
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      });
      const result = await res.json();
      if (result.success) {
        showToast('Debugger successfully flushed. Store reinitialized.', 'success');
        setSelectedLog(null);
        setSelectedAnomaly(null);
        setChatHistory([]);
        mutate();
      }
    } catch (err: any) {
      showToast('Flush operation failed', 'error');
    }
  };

  const handleSelectLog = (log: APILog) => {
    setSelectedAnomaly(null);
    setSelectedLog(log);
  };

  const handleSelectAnomaly = (anomaly: Anomaly) => {
    setSelectedLog(null);
    setSelectedAnomaly(anomaly);
  };

  const getPredictionBadgeClass = (confidence: Prediction['confidence']) => {
    switch (confidence) {
      case 'high': return 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'low': default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-800';
    }
  };

  const renderMarkdownText = (text: string) => {
    const parseBoldText = (str: string) => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="text-teal-400 font-extrabold tracking-wide uppercase">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
    };

    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Match ordered list item (e.g. "1. Inspect logs")
      if (/^\d+\.\s/.test(trimmed)) {
        const cleanText = trimmed.replace(/^\d+\.\s/, '');
        const num = trimmed.match(/^\d+/)![0];
        return (
          <div key={idx} className="ml-4 flex items-start space-x-2 text-[11px] text-neutral-300 mb-1 leading-relaxed">
            <span className="text-teal-500 font-mono font-bold">{num}.</span>
            <span className="flex-1">{parseBoldText(cleanText)}</span>
          </div>
        );
      }

      // Match bullet list item (e.g. "- DB starvation")
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-[11px] text-neutral-300 mb-1 leading-relaxed">
            {parseBoldText(trimmed.substring(2))}
          </li>
        );
      }
      
      if (trimmed === '') return <div key={idx} className="h-2"></div>;
      
      return (
        <p key={idx} className="text-[11px] text-neutral-300 leading-relaxed mb-1">
          {parseBoldText(trimmed)}
        </p>
      );
    });
  };

  if (showLanding) {
    return (
      <main className="min-h-screen w-full bg-[#030308] text-neutral-100 relative overflow-hidden font-sans select-none" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>

        {/* ─── Full-Viewport GridScan WebGL Background ─── */}
        <div className="fixed inset-0 z-0">
          <GridScan
            sensitivity={0.55}
            lineThickness={1}
            linesColor="#140e2a"
            gridScale={0.09}
            scanColor="#a855f7"
            scanOpacity={0.35}
            enablePost
            bloomIntensity={0.5}
            chromaticAberration={0.0015}
            noiseIntensity={0.008}
            lineJitter={0.08}
            scanGlow={0.6}
            scanSoftness={2.5}
            enableWebcam={false}
            showPreview={false}
          />
        </div>

        {/* ─── Radial Glow Overlays ─── */}
        <div className="fixed inset-0 z-[1] pointer-events-none">
          <div style={{ position: 'absolute', top: '-10%', left: '30%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', bottom: '0%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', top: '40%', left: '-5%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        </div>

        {/* ─── Top Navigation Bar ─── */}
        <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4" style={{ backdropFilter: 'blur(20px)', background: 'rgba(3,3,8,0.7)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
          {/* Left: Logo */}
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="API Sentinel Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
            <span className="font-mono text-[11px] font-bold tracking-[0.3em] uppercase text-neutral-300">API SENTINEL</span>
          </div>
          {/* Center: Live status chips */}
          <div className="hidden md:flex items-center space-x-4">
            {['SYSTEMS NOMINAL', 'RAG ENGINE LIVE', 'AI CO-PILOT READY'].map((label, i) => (
              <span key={i} className="font-mono text-[9px] font-bold tracking-widest px-3 py-1 rounded-full border" style={{
                color: i === 0 ? '#10b981' : i === 1 ? '#a855f7' : '#fb923c',
                borderColor: i === 0 ? 'rgba(16,185,129,0.25)' : i === 1 ? 'rgba(168,85,247,0.25)' : 'rgba(251,146,60,0.25)',
                background: i === 0 ? 'rgba(16,185,129,0.06)' : i === 1 ? 'rgba(168,85,247,0.06)' : 'rgba(251,146,60,0.06)',
              }}>
                <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', marginRight: '6px', verticalAlign: 'middle', animation: 'ping 1.5s infinite' }} />
                {label}
              </span>
            ))}
          </div>
          {/* Right: Version badge */}
          <div className="font-mono text-[9px] text-neutral-500 tracking-widest border border-neutral-800 px-3 py-1 rounded-full">
            v1.2 · PROD READY
          </div>
        </div>

        {/* ─── Main Content (scrollable, padded for navbar) ─── */}
        <div className="relative z-10 min-h-screen flex flex-col pt-20">

          {/* ─── HERO SECTION ─── */}
          <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 pb-8">

            {/* Micro badge */}
            <div className="mb-6 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.3)', color: '#c084fc' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', marginRight: '4px', animation: 'ping 1.2s infinite' }} />
              SRE INCIDENT COMMANDER PLATFORM · AI-POWERED
            </div>

            {/* Main Shuffle-animated heading */}
            <div className="mb-4" style={{ fontSize: 'clamp(3rem, 9vw, 7rem)', lineHeight: '1', fontWeight: '900', letterSpacing: '-0.02em' }}>
              <Shuffle
                text="API SENTINEL"
                shuffleDirection="right"
                duration={0.4}
                animationMode="evenodd"
                shuffleTimes={2}
                ease="power3.out"
                stagger={0.03}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={true}
                respectReducedMotion={true}
                loop={false}
                loopDelay={0}
                colorFrom="#00fff7"
                colorTo="#ffffff"
                onShuffleComplete={() => {}}
                style={{
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                }}
              />
            </div>

            {/* Sub-headline with TrueFocus */}
            <div className="mb-6">
              <TrueFocus
                sentence="DETECT DIAGNOSE RESOLVE"
                manualMode={false}
                blurAmount={3}
                borderColor="#a855f7"
                glowColor="rgba(168,85,247,0.5)"
                animationDuration={0.6}
                pauseBetweenAnimations={1.8}
              />
            </div>

            {/* Description */}
            <p className="max-w-2xl text-sm leading-relaxed font-mono mb-10" style={{ color: 'rgba(163,163,163,0.85)' }}>
              An advanced DevOps & SRE cockpit. Inject attack scenarios, trace cascading failures in real-time,
              forecast outages before they happen, and consult a grounded AI commander for instant remediation.
            </p>

            {/* Floating Metric Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              {[
                { label: 'Avg MTTR', value: '4.2 min', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
                { label: 'Anomalies Caught', value: '99.7%', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)' },
                { label: 'AI Accuracy', value: '97.3%', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)' },
                { label: 'Log Throughput', value: '50k/s', color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.25)' },
                { label: 'Endpoints', value: '200+', color: '#14b8a6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.25)' },
              ].map((m, i) => (
                <div key={i} className="flex items-center space-x-2 px-4 py-2 rounded-2xl border font-mono" style={{ background: m.bg, borderColor: m.border }}>
                  <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: 'rgba(163,163,163,0.7)' }}>{m.label}</span>
                  <span className="text-[13px] font-extrabold" style={{ color: m.color, textShadow: `0 0 12px ${m.color}` }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* ─── CTA Button ─── */}
            <div className="mb-16">
              <StarBorder
                as="button"
                onClick={() => setShowLanding(false)}
                color="#a855f7"
                speed="3.5s"
                className="rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold uppercase overflow-hidden"
              >
                <div className="flex items-center space-x-3 px-10 py-4 text-sm font-mono font-bold rounded-full tracking-widest" style={{ background: 'rgba(10,5,20,0.92)', color: '#c084fc', backdropFilter: 'blur(10px)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  <span>INTRUDE COCKPIT CONTROL</span>
                  <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </div>
              </StarBorder>
            </div>
          </section>

          {/* ─── FEATURE CARDS GRID ─── */}
          <section className="px-8 pb-12 max-w-6xl mx-auto w-full">
            <div className="text-center mb-8">
              <span className="font-mono text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(168,85,247,0.6)' }}>CORE WORKSPACES</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: '🚀', label: 'COMMAND_DECK', badge: 'Active Monitor',
                  desc: 'Real-time stat gauges, predictive risk forecasts, AI incident ledgers, and recovery checklists.',
                  color: '#10b981', border: 'rgba(16,185,129,0.15)', bg: 'rgba(16,185,129,0.04)',
                  glow: 'rgba(16,185,129,0.08)'
                },
                {
                  icon: '📟', label: 'LOG_STREAM', badge: 'Lexical Feed',
                  desc: 'High-density terminal log feed with regex filters, payload inspection, and anomaly highlights.',
                  color: '#a855f7', border: 'rgba(168,85,247,0.15)', bg: 'rgba(168,85,247,0.04)',
                  glow: 'rgba(168,85,247,0.08)'
                },
                {
                  icon: '🕸️', label: 'CASCADE_MAP', badge: 'Graph Linker',
                  desc: 'Dynamic circular SVG microservices topology mapping cascading failure propagation paths.',
                  color: '#6366f1', border: 'rgba(99,102,241,0.15)', bg: 'rgba(99,102,241,0.04)',
                  glow: 'rgba(99,102,241,0.08)'
                },
                {
                  icon: '💬', label: 'AI_COMMANDER', badge: 'RAG Thread',
                  desc: 'Operational SRE assistant grounded in live log context. Ask anything, get remediation actions.',
                  color: '#fb923c', border: 'rgba(251,146,60,0.15)', bg: 'rgba(251,146,60,0.04)',
                  glow: 'rgba(251,146,60,0.08)'
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="group relative p-5 rounded-2xl flex flex-col justify-between cursor-default transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: card.bg,
                    border: `1px solid ${card.border}`,
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 4px 30px ${card.glow}`,
                    minHeight: '180px',
                  }}
                >
                  {/* Top row */}
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{card.icon}</span>
                      <span className="font-mono text-[8px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-full border" style={{ color: card.color, borderColor: card.border, background: 'rgba(0,0,0,0.3)' }}>
                        {card.badge}
                      </span>
                    </div>
                    <h3 className="font-mono text-[11px] font-extrabold tracking-widest uppercase mb-2" style={{ color: card.color }}>
                      {card.label}
                    </h3>
                    <p className="text-[10px] leading-relaxed font-mono" style={{ color: 'rgba(163,163,163,0.65)' }}>
                      {card.desc}
                    </p>
                  </div>
                  {/* Bottom indicator bar */}
                  <div className="mt-4 h-0.5 rounded-full w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all duration-700 group-hover:w-full" style={{ width: '40%', background: `linear-gradient(90deg, ${card.color}80, ${card.color})`, boxShadow: `0 0 8px ${card.color}` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom footnote */}
            <div className="text-center mt-8 font-mono text-[9px] tracking-widest uppercase" style={{ color: 'rgba(115,115,115,0.6)' }}>
              SRE Incident Management Terminal · Powered by Llama 3.3 70B · Secure RAG Pipeline Active
            </div>
          </section>

        </div>

        {/* ─── Pulse animation keyframes ─── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
          @keyframes ping {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-neutral-100 p-4 md:p-6 font-sans select-text relative overflow-x-hidden">
      
      {/* Interactive WebGL Galaxy Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-100">
        <Galaxy 
          mouseRepulsion
          mouseInteraction
          density={1.2}
          glowIntensity={0.5}
          saturation={0}
          hueShift={140}
          twinkleIntensity={0.85}
          rotationSpeed={0.03}
          repulsionStrength={2.0}
          autoCenterRepulsion={0}
          starSpeed={0.3}
          speed={1.0}
        />
      </div>

      <div className="max-w-7xl mx-auto space-y-5 relative z-10">
        
        {/* Toast Alerts System */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border backdrop-blur-md shadow-lg flex items-center space-x-3 transition-all duration-300 animate-slide-in ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : toastMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            <span className="text-xs font-mono font-bold tracking-tight">{toastMessage.text}</span>
          </div>
        )}

        {/* Global Navbar Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-neutral-800/80 pb-4 gap-4">
          
          {/* Logo Brand featuring TrueFocus */}
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="API Sentinel Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_12px_rgba(20,184,166,0.6)] animate-pulse" />
            <GlitchText
              speed={1}
              enableShadows={true}
              enableOnHover={false}
            >
              API SENTINEL
            </GlitchText>
            <span className="px-2 py-0.5 rounded text-[8px] font-mono font-extrabold border border-teal-500/20 bg-teal-500/10 text-teal-400 tracking-widest hidden sm:inline animate-pulse">
              CO_PILOT_V1.2
            </span>
          </div>

          {/* SRE Multi-Workspace Workspace Selection Tabs */}
          <div className="flex bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-xl p-1 font-mono text-[10px] font-bold">
            <button
              onClick={() => setActiveWorkspace('deck')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeWorkspace === 'deck'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 shadow-inner'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              🚀 COMMAND_DECK
            </button>
            <button
              onClick={() => setActiveWorkspace('terminal')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeWorkspace === 'terminal'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 shadow-inner'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              📟 LOG_STREAM
            </button>
            <button
              onClick={() => setActiveWorkspace('topology')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeWorkspace === 'topology'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 shadow-inner'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              🕸️ CASCADE_MAP
            </button>
            <button
              onClick={() => setActiveWorkspace('chat')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeWorkspace === 'chat'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 shadow-inner'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              💬 AI_COMMANDER_CHAT
            </button>
          </div>

          {/* Interactive Controller buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLanding(true)}
              className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xl border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all cursor-pointer"
              title="Return to Landing Page"
            >
              ← Back
            </button>
          {/* ─── Custom Chaos Scenario Dropdown ─── */}
          {(() => {
            const SCENARIOS: { id: ChaosScenario; label: string; icon: string; color: string; border: string; bg: string; desc: string }[] = [
              { id: 'healthy',         label: 'Healthy Traffic',       icon: '✅', color: '#10b981', border: 'rgba(16,185,129,0.35)',  bg: 'rgba(16,185,129,0.08)',  desc: 'All services nominal' },
              { id: 'payment_failure', label: 'Payment Failure',       icon: '💳', color: '#f59e0b', border: 'rgba(245,158,11,0.35)',  bg: 'rgba(245,158,11,0.08)',  desc: '65% checkout failures + cascade' },
              { id: 'db_timeout',      label: 'DB Timeout',            icon: '🗄️', color: '#fb923c', border: 'rgba(251,146,60,0.35)',  bg: 'rgba(251,146,60,0.08)',  desc: '2–5s real latency spike' },
              { id: 'auth_breach',     label: 'Auth Breach',           icon: '🔐', color: '#a855f7', border: 'rgba(168,85,247,0.35)',  bg: 'rgba(168,85,247,0.08)',  desc: 'Brute force, 75% rejections' },
              { id: 'traffic_spike',   label: 'Traffic Spike',         icon: '📈', color: '#6366f1', border: 'rgba(99,102,241,0.35)',  bg: 'rgba(99,102,241,0.08)',  desc: 'Overload, 28% payment fail' },
              { id: 'cascade_failure', label: 'Full Cascade Failure',  icon: '🔥', color: '#ef4444', border: 'rgba(239,68,68,0.35)',   bg: 'rgba(239,68,68,0.08)',   desc: 'CRITICAL: all services down' },
            ];
            const active = SCENARIOS.find(s => s.id === activeScenario) || SCENARIOS[0];
            return (
              <div ref={dropdownRef} className="relative">
                {/* Trigger Button */}
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold transition-all hover:brightness-110 cursor-pointer"
                  style={{ background: active.bg, borderColor: active.border, color: active.color }}
                >
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider hidden sm:inline">⚡ CHAOS</span>
                  <span className="text-neutral-600 hidden sm:inline">·</span>
                  <span>{active.icon}</span>
                  <span style={{ color: active.color }}>{active.label}</span>
                  <svg className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                </button>
                {/* Dropdown Panel */}
                {dropdownOpen && (
                  <div
                    className="absolute top-full mt-2 left-0 z-50 rounded-2xl border overflow-hidden shadow-2xl min-w-[260px]"
                    style={{ background: 'rgba(8,6,14,0.97)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
                  >
                    <div className="px-3 py-2 border-b border-neutral-800/60">
                      <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-neutral-500">SELECT CHAOS SCENARIO</span>
                    </div>
                    {SCENARIOS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setActiveScenario(s.id); setDropdownOpen(false); runSimulation(s.id); }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-left transition-all cursor-pointer group"
                        style={s.id === activeScenario ? { background: s.bg } : { background: 'transparent' }}
                        onMouseEnter={e => { if (s.id !== activeScenario) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { if (s.id !== activeScenario) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <span className="text-base leading-none">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-mono font-bold" style={{ color: s.id === activeScenario ? s.color : '#e5e5e5' }}>{s.label}</span>
                            {s.id === activeScenario && <span className="text-[8px] font-mono font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: s.border, color: s.color }}>ACTIVE</span>}
                          </div>
                          <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(163,163,163,0.55)' }}>{s.desc}</div>
                        </div>
                        {s.id === activeScenario && (
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: s.color }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

            {/* Simulate real traffic trigger */}
            <button
              onClick={handleGenerateTraffic}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <span className="flex items-center space-x-1.5">
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <span>Simulating...</span>
                </span>
              ) : '⚡ Simulate Traffic'}
            </button>

            {/* AI Agent Analysis Trigger */}
            <StarBorder
              as="button"
              onClick={handleRunAIAnalysis}
              disabled={isAnalyzing || !data?.logs || data.logs.length === 0}
              color={isAnalyzing ? '#f59f0b' : '#10b981'}
              speed={isAnalyzing ? '2.5s' : '5s'}
              className="rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer font-bold uppercase overflow-hidden"
            >
              <div className="flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-bold text-neutral-100 bg-[#0c0a12]/85 backdrop-blur-md rounded-xl">
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-amber-400">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    <span className="text-emerald-400">Run AI Agent</span>
                  </>
                )}
              </div>
            </StarBorder>

            {/* Clear button */}
            <button
              onClick={handleClearBuffer}
              disabled={!data?.logs || data.logs.length === 0}
              className="px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all disabled:opacity-30 cursor-pointer"
              title="Clear debugger store"
            >
              Flush
            </button>
          </div>
        </div>

        {/* ─── LIVE SIMULATION RESULTS STRIP ─── */}
        {lastSimResult && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-800/60 bg-neutral-950/70 backdrop-blur-md text-[10px] font-mono">
            <span className="flex items-center space-x-1.5 text-rose-400 font-bold">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>
              <span>REAL API SIM</span>
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-400">{lastSimResult.totalRequests} requests</span>
            <span className={`font-bold ${lastSimResult.errorRate > 20 ? 'text-rose-400' : lastSimResult.errorRate > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {lastSimResult.errorRate}% errors
            </span>
            <span className="text-neutral-400">avg <span className={`font-bold ${lastSimResult.avgLatency > 1000 ? 'text-rose-400' : lastSimResult.avgLatency > 300 ? 'text-amber-400' : 'text-emerald-400'}`}>{lastSimResult.avgLatency}ms</span></span>
            <span className="text-neutral-400">peak <span className="font-bold text-neutral-200">{lastSimResult.maxLatency}ms</span></span>
            <span className={`ml-auto px-2 py-0.5 rounded-full border text-[8px] font-extrabold tracking-widest ${
              lastSimResult.errorRate > 30 ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' :
              lastSimResult.errorRate > 10 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
              'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
            }`}>
              {lastSimResult.errorRate > 30 ? '🔥 INCIDENT ACTIVE' : lastSimResult.errorRate > 10 ? '⚠️ DEGRADED' : '✅ NOMINAL'}
            </span>
          </div>
        )}

        {/* ================= CONDITIONAL WORKSPACE VIEWER ================= */}
        {error ? (
          <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-rose-400 text-center font-mono text-xs">
            <span>Failed to connect to local API Sentinel endpoints. Ensure your development server is running.</span>
          </div>
        ) : !data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl border border-neutral-800/60 bg-neutral-900/20 animate-pulse"></div>
              ))}
            </div>
            <div className="h-[500px] rounded-2xl border border-neutral-800/60 bg-neutral-900/10 animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* Health Indicators (Kept global above Workspaces except Full Chat) */}
            {activeWorkspace !== 'chat' && <HealthIndicator stats={data.stats} />}

            {/* 1. WORKSPACE: COMMAND DECK */}
            {activeWorkspace === 'deck' && (
              <div className="space-y-5 animate-fade-in">
                
                {/* Proactive Risk Warnings (AI Forecast Banner) */}
                {data.predictions && data.predictions.length > 0 && (
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-[#161006]/92 shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-3">
                    <div className="flex items-center space-x-2 text-amber-400 border-b border-amber-500/10 pb-1.5">
                      <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest">⚠️ PREDICTIVE RISK FORECAST (PROACTIVE SHIELD)</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.predictions.map((p, index) => (
                        <div key={index} className="p-3 rounded-xl border border-neutral-900 bg-neutral-950/70 font-mono text-[10px] space-y-2 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-100 font-bold break-all max-w-[70%]">{p.endpoint}</span>
                            <span className={`px-2 py-0.2 rounded text-[8px] font-extrabold border uppercase ${getPredictionBadgeClass(p.confidence)}`}>
                              {p.confidence} Risk
                            </span>
                          </div>
                          <p className="text-neutral-400 leading-normal text-[9.5px] mt-1">{p.reasoning}</p>
                          <div className="text-rose-400 font-bold border-t border-neutral-900/60 pt-1.5 flex items-center justify-between text-[8px]">
                            <span>EXPECTED OUTAGE: {p.predictedFailureType.toUpperCase()}</span>
                            <span>PROACTIVE WATCH</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left: AI Incident Report ledger */}
                  <div className="lg:col-span-8 flex flex-col space-y-2">
                    <div className="flex items-center justify-between pl-1">
                      <h3 className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                        AI_INCIDENT_LEDGER
                      </h3>
                      <span className="text-[10px] text-neutral-500 font-mono">Isolated Outage Reports</span>
                    </div>
                    <AnomalyCard anomalies={data.anomalies} onSelectAnomaly={handleSelectAnomaly} />
                  </div>

                  {/* Right: Timeline Audit log */}
                  <div className="lg:col-span-4 flex flex-col space-y-2">
                    <div className="flex items-center justify-between pl-1">
                      <h3 className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                        AUDIT_CHRONO_TIMELINE
                      </h3>
                      <span className="text-[10px] text-neutral-500 font-mono">Chrono Cascade</span>
                    </div>
                    <div className="p-4 rounded-2xl border border-neutral-800 bg-[#08070b]/92 backdrop-blur-md shadow-xl shadow-black/40 h-full min-h-[350px]">
                      <AlertTimeline anomalies={data.anomalies} onSelectAnomaly={handleSelectAnomaly} />
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 2. WORKSPACE: LOGSTREAM MONITOR */}
            {activeWorkspace === 'terminal' && (
              <div className="animate-fade-in">
                <LogStream logs={data.logs} onSelectLog={handleSelectLog} />
              </div>
            )}

            {/* 3. WORKSPACE: SYSTEM TOPOLOGY MAP */}
            {activeWorkspace === 'topology' && (
              <div className="max-w-4xl mx-auto animate-fade-in flex flex-col space-y-4">
                <CausalGraph links={data.causalLinks || []} />
                
                {/* Informational card detailing the system structure */}
                <div className="p-4 rounded-xl border border-neutral-900 bg-neutral-950/60 backdrop-blur-md text-xs space-y-2">
                  <h4 className="font-bold text-neutral-200 font-mono">💡 SRE Cascade Mapping Architecture</h4>
                  <p className="text-neutral-400 leading-relaxed font-mono text-[10px]">
                    The Causal Dependency Map dynamically traces root failure paths. A Red Star indicates the calculated root-cause vector (e.g. database locks, unhandled payments compiler crashes). Connected arrows trace how that single node outage propagates downstream to slow down checkout pay segments and search analytics blocks.
                  </p>
                </div>
              </div>
            )}

            {/* 4. WORKSPACE: CO-PILOT CHAT INTERFACE */}
            {activeWorkspace === 'chat' && (
              <div className="max-w-4xl mx-auto h-[620px] rounded-2xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                
                {/* Console Terminal Header */}
                <div className="p-4 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400"></span>
                    </span>
                    <span className="text-xs font-mono font-bold text-neutral-200 uppercase tracking-widest">
                      AI INCIDENT COMMANDER CHAT_TERMINAL
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">llama-3.3-70b-versatile Active</span>
                </div>

                {/* Console Conversation Feed */}
                <div 
                  ref={chatScrollRef}
                  className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent bg-neutral-950/50"
                >
                  {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-4 max-w-md mx-auto text-center font-mono">
                      <svg className="w-12 h-12 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                      <TrueFocus 
                        sentence="INCIDENT COMMANDER"
                        manualMode={false}
                        blurAmount={4}
                        borderColor="#14b8a6"
                        glowColor="rgba(20, 184, 166, 0.6)"
                        animationDuration={0.8}
                        pauseBetweenAnimations={2.0}
                      />
                      <span className="text-[11px] leading-relaxed">
                        I am your active SRE Incident Commander. You can ask me troubleshooting questions about your logs and system health in natural language!
                      </span>
                      
                      {/* Interactive Quick-Click Prompt Suggestions */}
                      <div className="w-full flex flex-col space-y-1.5 pt-2">
                        <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-wider">Quick Suggestions:</span>
                        <button 
                          onClick={() => handleConsultChat("Why did Cart POST fail and what is the exact TypeError trace?")}
                          className="px-3 py-1.5 rounded-lg border border-neutral-900 bg-neutral-900/30 hover:bg-neutral-900 text-left text-neutral-400 hover:text-neutral-200 text-[10px] transition-colors cursor-pointer"
                        >
                          "Why did Cart POST fail and what is the exact TypeError trace?"
                        </button>
                        <button 
                          onClick={() => handleConsultChat("Analyze the WAF logs and summarize any SQL Injection scanner IPs.")}
                          className="px-3 py-1.5 rounded-lg border border-neutral-900 bg-neutral-900/30 hover:bg-neutral-900 text-left text-neutral-400 hover:text-neutral-200 text-[10px] transition-colors cursor-pointer"
                        >
                          "Analyze the WAF logs and summarize any SQL Injection scanner IPs."
                        </button>
                        <button 
                          onClick={() => handleConsultChat("Summarize the latency spike failures. Which endpoint has a gateway timeout?")}
                          className="px-3 py-1.5 rounded-lg border border-neutral-900 bg-neutral-900/30 hover:bg-neutral-900 text-left text-neutral-400 hover:text-neutral-200 text-[10px] transition-colors cursor-pointer"
                        >
                          "Summarize the latency spike failures. Which endpoint has a gateway timeout?"
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-3xl mx-auto">
                      {chatHistory.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col space-y-1.5 ${
                            msg.sender === 'user' ? 'items-end' : 'items-start'
                          }`}
                        >
                          {/* Sender timestamp header */}
                          <div className="flex items-center space-x-2 text-[9px] font-mono text-neutral-500">
                            <span>{msg.sender === 'user' ? 'DEVELOPER' : 'AI INCIDENT COMMANDER'}</span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </div>

                          {/* Message box */}
                          <div className={`p-4 rounded-xl border max-w-[85%] text-xs font-mono leading-relaxed select-text ${
                            msg.sender === 'user'
                              ? 'bg-teal-500/10 border-teal-500/20 text-teal-300 rounded-br-none'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-200 rounded-bl-none shadow-md'
                          }`}>
                            {msg.sender === 'user' ? (
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            ) : (
                              <div className="space-y-1.5">{renderMarkdownText(msg.text)}</div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Loader */}
                      {isChatLoading && (
                        <div className="flex flex-col space-y-1.5 items-start animate-pulse">
                          <span className="text-[9px] font-mono text-neutral-500">INCIDENT COMMANDER PROCESSING...</span>
                          <div className="p-4 rounded-xl border border-neutral-900 bg-neutral-900 text-xs font-mono text-neutral-400 flex items-center space-x-2.5">
                            <svg className="animate-spin h-3.5 w-3.5 text-teal-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Analyzing buffer logs context...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Console Chat Input Deck */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleConsultChat(chatQuestion);
                  }}
                  className="p-4 bg-neutral-900/60 border-t border-neutral-800/80 flex items-center gap-3"
                >
                  <input
                    type="text"
                    placeholder="Describe an outage or ask a question about API performance logs..."
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    disabled={isChatLoading}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 font-mono text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || chatQuestion.trim() === ''}
                    className="px-4 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 hover:border-teal-500/50 text-teal-400 font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-30 disabled:hover:bg-teal-500/10 cursor-pointer"
                  >
                    SEND_QUERY
                  </button>
                </form>

              </div>
            )}

          </div>
        )}

        {/* Floating Explanation Drawer Sheet */}
        <ExplanationSheet
          anomaly={selectedAnomaly}
          log={selectedLog}
          onClose={() => {
            setSelectedLog(null);
            setSelectedAnomaly(null);
          }}
          allLogs={data?.logs || []}
        />

      </div>
    </main>
  );
}
