import React, { useState, useEffect } from 'react';
import { Anomaly, APILog } from '@/types';

interface ExplanationSheetProps {
  anomaly: Anomaly | null;
  log: null | APILog;
  onClose: () => void;
  allLogs: APILog[];
}

export const ExplanationSheet: React.FC<ExplanationSheetProps> = ({
  anomaly,
  log,
  onClose,
  allLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'incident' | 'playbook' | 'logs'>('incident');
  const [isJuniorMode, setIsJuniorMode] = useState(false);
  const [checkedChecklist, setCheckedChecklist] = useState<Record<string, boolean>>({});

  // Reset states when a new anomaly or log is loaded
  useEffect(() => {
    setIsJuniorMode(false);
  }, [anomaly, log]);

  if (!anomaly && !log) return null;

  // Find logs associated with this anomaly
  const associatedLogs = anomaly
    ? allLogs.filter(l => anomaly.associatedLogIds.includes(l.id))
    : [];

  const getSeverityBadgeClass = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'low': default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-800';
    }
  };

  const getStatusBadgeClass = (status: number) => {
    if (status < 300) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (status < 500) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  const formatJSON = (jsonStr?: string) => {
    if (!jsonStr) return 'N/A';
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  };

  // Toggle item in SRE checklist
  const handleToggleChecklist = (itemKey: string) => {
    setCheckedChecklist(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  // Helper to render markdown-like lists cleanly in UI
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-neutral-300 mb-1 leading-relaxed">
            {trimmed.substring(2)}
          </li>
        );
      }
      if (trimmed.match(/^\d+\.\s/)) {
        const content = trimmed.replace(/^\d+\.\s/, '');
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-neutral-300 mb-1 leading-relaxed">
            {content}
          </li>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2"></div>;
      }
      return (
        <p key={idx} className="text-xs text-neutral-300 leading-relaxed mb-2">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-text">
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-300"
      ></div>

      {/* Drawer Container */}
      <div className="relative w-full sm:w-[560px] md:w-[700px] h-full bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out transform translate-x-0">
        
        {/* Header */}
        <div className="p-5 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase">
              {anomaly ? '🚨 SRE_INCIDENT_COMMANDER' : '⚙️ RAW_LOG_INSPECTION'}
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-xs font-mono text-neutral-400">
              {anomaly ? anomaly.id : log?.id}
            </span>
          </div>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          
          {/* ================= MODE: ANOMALY DETAILS ================= */}
          {anomaly && (
            <div className="space-y-6">
              
              {/* Flashing Incident Commander Banner */}
              <div className={`p-4 rounded-2xl border bg-neutral-900/10 backdrop-blur-xs flex items-center justify-between shadow-md ${
                anomaly.severity === 'critical' ? 'border-rose-500/30' : 'border-amber-500/30'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      anomaly.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      anomaly.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}></span>
                  </span>
                  <div>
                    <h3 className="text-xs font-mono font-bold tracking-widest text-neutral-200 uppercase">INCIDENT ACTIVE</h3>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">COMMANDER STATE: INVESTIGATING</p>
                  </div>
                </div>
                
                {/* Junior Mode Toggle */}
                <button
                  onClick={() => setIsJuniorMode(!isJuniorMode)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    isJuniorMode 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-inner' 
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  👶 {isJuniorMode ? 'Switch to Senior' : "Explain Like I'm a Junior"}
                </button>
              </div>

              {/* Title & Metadata Card */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase border ${getSeverityBadgeClass(anomaly.severity)}`}>
                    {anomaly.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase border border-sky-500/20 bg-sky-500/10 text-sky-400">
                    {anomaly.type}
                  </span>
                  <span className="text-[9px] text-neutral-500 font-mono ml-auto">
                    {new Date(anomaly.timestamp).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-base font-black text-neutral-100 tracking-tight leading-snug">
                  {anomaly.summary}
                </h2>
              </div>

              {/* Grid: Service Affected, MTR Recovery, Blast Radius */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-neutral-900 bg-neutral-950 flex flex-col justify-between">
                  <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-wider">Service Affected</span>
                  <span className="text-xs font-bold text-neutral-200 mt-2 truncate select-all">{anomaly.serviceAffected}</span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-900 bg-neutral-950 flex flex-col justify-between">
                  <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-wider">Recovery EST</span>
                  <span className="text-xs font-bold text-teal-400 mt-2 tracking-wide font-mono">{anomaly.estimatedRecoveryTime}</span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-900 bg-neutral-950 flex flex-col justify-between">
                  <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-wider">Blast Radius</span>
                  <span className="text-xs font-bold text-neutral-200 mt-2 font-mono">{anomaly.associatedLogIds.length} logs affected</span>
                </div>
              </div>

              {/* Business Impact Card */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 shadow-md space-y-2">
                <div className="flex items-center space-x-2 text-amber-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <h4 className="text-[10px] font-mono font-extrabold uppercase tracking-widest">Business Impact AI</h4>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans font-medium">
                  {anomaly.businessImpact}
                </p>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-neutral-900 gap-4">
                <button
                  onClick={() => setActiveTab('incident')}
                  className={`pb-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'incident' 
                      ? 'border-teal-500 text-teal-400' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  INCIDENT_COMMAND_ROOM
                </button>
                <button
                  onClick={() => setActiveTab('playbook')}
                  className={`pb-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'playbook' 
                      ? 'border-teal-500 text-teal-400' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  ARCHITECT_PLAYBOOK
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`pb-2 text-xs font-mono font-bold border-b-2 transition-all flex items-center cursor-pointer ${
                    activeTab === 'logs' 
                      ? 'border-teal-500 text-teal-400' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  TRIGGERING_RAW_LOGS
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                    {associatedLogs.length}
                  </span>
                </button>
              </div>

              {/* Tab 1: Incident Control Room */}
              {activeTab === 'incident' && (
                <div className="space-y-6">
                  
                  {/* AI Explanation / Root Cause diagnostics */}
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-1.5">
                      <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                      <h4 className="text-[11px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
                        {isJuniorMode ? 'Diagnostics (Junior Dev Mode)' : 'Diagnostics & SRE Root Cause'}
                      </h4>
                    </div>

                    {isJuniorMode ? (
                      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/2 shadow-inner text-neutral-300 text-xs leading-relaxed font-sans font-medium border-l-4 border-l-amber-500">
                        <div className="flex items-start space-x-2.5">
                          <span className="text-xl">💡</span>
                          <div>{renderMarkdown(anomaly.juniorExplanation)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-neutral-900 bg-neutral-900/10 text-neutral-300 text-xs leading-relaxed">
                        {renderMarkdown(anomaly.explanation)}
                      </div>
                    )}
                  </div>

                  {/* SRE Tactical Actions Checklist */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-mono font-bold tracking-widest text-neutral-400 uppercase flex items-center">
                      <svg className="w-4 h-4 mr-1 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                      Immediate Incident Mitigation Checklist
                    </h4>
                    <div className="p-4 rounded-xl border border-neutral-900 bg-neutral-950 font-mono text-[11px] space-y-3">
                      <span className="text-[10px] text-teal-400/70 block border-b border-neutral-900 pb-1.5 uppercase font-bold">Commander Playbook: Tick off items to mitigate</span>
                      {anomaly.actionChecklist.map((item, idx) => {
                        const itemKey = `${anomaly.id}_item_${idx}`;
                        const isChecked = checkedChecklist[itemKey] || false;
                        
                        return (
                          <div 
                            key={idx}
                            onClick={() => handleToggleChecklist(itemKey)}
                            className="flex items-center space-x-3 p-2 rounded bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-900/60 cursor-pointer select-none transition-colors duration-150"
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              readOnly
                              className="w-3.5 h-3.5 rounded border-neutral-800 bg-neutral-950 accent-teal-500 cursor-pointer"
                            />
                            <span className={`transition-all duration-300 font-medium ${
                              isChecked ? 'line-through text-neutral-600' : 'text-neutral-300'
                            }`}>
                              {item}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Architect Playbook */}
              {activeTab === 'playbook' && (
                <div className="space-y-6">
                  {/* Long-term mitigation code/architecture playbooks */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-mono font-bold tracking-widest text-neutral-400 uppercase flex items-center">
                      <svg className="w-4 h-4 mr-1 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                      Long-Term Mitigation & Code Upgrades
                    </h4>
                    <div className="p-4 rounded-xl border border-neutral-900 bg-neutral-900/10 text-neutral-300 text-xs leading-relaxed">
                      {renderMarkdown(anomaly.mitigation)}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Triggering Logs */}
              {activeTab === 'logs' && (
                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-neutral-500 block mb-2">Logs parsed by Groq LLM to isolate this anomaly event:</span>
                  {associatedLogs.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border border-neutral-900 bg-neutral-950 font-mono text-[10px] space-y-2">
                      <div className="flex items-center justify-between text-neutral-400">
                        <span className="text-neutral-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        <div className="flex space-x-1.5">
                          <span className={`px-1.5 py-0.2 rounded font-extrabold border ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="bg-neutral-900 px-1 border border-neutral-800 text-neutral-400 font-bold">{item.method}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-200 font-bold break-all max-w-[80%]">{item.path}</span>
                        <span className="text-neutral-500">{item.latency}ms</span>
                      </div>
                      <div className="text-neutral-600 truncate">IP: {item.clientIp} • UA: {item.userAgent}</div>
                      {item.errorMessage && (
                        <div className="text-rose-400 font-bold bg-rose-500/5 p-1 rounded border border-rose-500/10 break-all select-all">
                          {item.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ================= MODE: LOG DETAILS ================= */}
          {log && (
            <div className="space-y-6">
              {/* Log Overview */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/20 backdrop-blur-xs space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <span className="px-2 py-0.5 rounded font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {log.method}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-extrabold border ${getStatusBadgeClass(log.status)}`}>
                      {log.status}
                    </span>
                    <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 text-neutral-300">
                      {log.latency} ms
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm font-bold text-neutral-100 break-all select-all">{log.path}</div>
              </div>

              {/* Client Network Profile */}
              <div className="space-y-2.5 font-mono">
                <h4 className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Client Profile</h4>
                <div className="p-3 rounded-lg border border-neutral-900 bg-neutral-900/10 text-[11px] space-y-1.5 text-neutral-300">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Client IP Address:</span>
                    <span className="text-neutral-200 select-all font-bold">{log.clientIp}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500 mb-1">User Agent Header:</span>
                    <span className="text-neutral-400 text-[10px] bg-neutral-950 p-2 rounded border border-neutral-900 break-all leading-normal">
                      {log.userAgent}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Payload JSON Inspector */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Request Payload In</h4>
                <pre className="p-3 rounded-lg border border-neutral-900 bg-neutral-950 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                  {formatJSON(log.requestPayload)}
                </pre>
              </div>

              {/* Response Payload JSON Inspector */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Response Payload Out</h4>
                <pre className={`p-3 rounded-lg border border-neutral-900 bg-neutral-950 text-[10px] font-mono overflow-x-auto max-h-48 leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent ${
                  log.status >= 500 ? 'text-rose-400 font-semibold' : 'text-sky-400'
                }`}>
                  {formatJSON(log.responsePayload)}
                </pre>
              </div>

              {/* Stack trace/Error Message if present */}
              {log.errorMessage && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold tracking-widest text-rose-400 uppercase flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    Unhandled Trace Message
                  </h4>
                  <pre className="p-3 rounded-lg border border-rose-950 bg-rose-950/5 text-[10px] font-mono text-rose-400 overflow-x-auto max-h-48 leading-normal border-l-4 border-l-rose-500 whitespace-pre-wrap select-all">
                    {log.errorMessage}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
