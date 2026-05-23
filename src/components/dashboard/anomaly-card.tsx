import React from 'react';
import { Anomaly } from '@/types';

interface AnomalyCardProps {
  anomalies: Anomaly[];
  onSelectAnomaly: (anomaly: Anomaly) => void;
}

export const AnomalyCard: React.FC<AnomalyCardProps> = ({ anomalies, onSelectAnomaly }) => {
  
  const getSeverityStyle = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-rose-500/60 hover:border-rose-400 bg-[#16080b]/92',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
          text: 'text-rose-400'
        };
      case 'high':
        return {
          glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-red-500/50 hover:border-red-400 bg-[#160606]/92',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20',
          dot: 'bg-red-500 shadow-[0_0_8px_#ef4444]',
          text: 'text-red-400'
        };
      case 'medium':
        return {
          glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-amber-500/50 hover:border-amber-400 bg-[#161006]/92',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500 shadow-[0_0_6px_#f59e0b]',
          text: 'text-amber-400'
        };
      case 'low':
      default:
        return {
          glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-neutral-800 hover:border-neutral-700 bg-[#0c0c10]/92',
          badge: 'bg-neutral-500/10 text-neutral-400 border-neutral-800',
          dot: 'bg-neutral-400',
          text: 'text-neutral-300'
        };
    }
  };

  const getTypeIcon = (type: Anomaly['type']) => {
    switch (type) {
      case 'security':
        return (
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        );
      case 'performance':
        return (
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        );
      case 'behavior':
      default:
        return (
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        );
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const time = new Date(isoString).getTime();
    const now = Date.now();
    const diffSeconds = Math.floor((now - time) / 1000);

    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-neutral-800 bg-[#08070b]/95 backdrop-blur-md shadow-xl shadow-black/40">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        </div>
        <h3 className="text-sm font-semibold text-neutral-200">No Anomalies Detected</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm">The AI Debugging Agent has analyzed the traffic buffer and found no security threats or performance bottlenecks. Perfect health status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
      {anomalies.map((anomaly) => {
        const style = getSeverityStyle(anomaly.severity);
        return (
          <div
            key={anomaly.id}
            onClick={() => onSelectAnomaly(anomaly)}
            className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 cursor-pointer ${style.glow} group hover:-translate-y-0.5`}
          >
            <div className="flex flex-col space-y-2">
              {/* Header: Severity dot, type badge & timestamp */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${style.dot} animate-pulse`}></span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${style.badge} flex items-center`}>
                    {getTypeIcon(anomaly.type)}
                    {anomaly.type}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono tracking-tight bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    {anomaly.severity.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {formatTimeAgo(anomaly.timestamp)}
                </span>
              </div>
              {/* Title / Summary */}
              <h4 className="text-xs font-bold text-neutral-100 group-hover:text-white transition-colors mt-1">
                {anomaly.summary}
              </h4>

              {/* Service Affected */}
              <div className="text-[10px] text-neutral-400 font-mono flex items-center space-x-1">
                <span className="text-neutral-500 font-bold">SVC:</span>
                <span className="font-semibold text-neutral-300 truncate max-w-[220px]">{anomaly.serviceAffected}</span>
              </div>

              {/* Primary path affected */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-900 overflow-hidden text-ellipsis max-w-[70%] whitespace-nowrap">
                  {anomaly.path}
                </span>
                
                {/* Micro Action Button */}
                <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-100 flex items-center transition-colors">
                  Inspect
                  <svg className="w-3.5 h-3.5 ml-0.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                </span>
              </div>            </div>
          </div>
        );
      })}
    </div>
  );
};
