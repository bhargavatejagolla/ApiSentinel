import React from 'react';
import { Anomaly } from '@/types';

interface AlertTimelineProps {
  anomalies: Anomaly[];
  onSelectAnomaly: (anomaly: Anomaly) => void;
}

export const AlertTimeline: React.FC<AlertTimelineProps> = ({ anomalies, onSelectAnomaly }) => {
  
  const getSeverityColors = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical': return 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
      case 'high': return 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
      case 'medium': return 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.3)]';
      case 'low':
      default: return 'border-neutral-700 bg-neutral-800 text-neutral-400';
    }
  };

  const getTimelineBadge = (type: Anomaly['type']) => {
    switch (type) {
      case 'security': return '🛡️ SEC';
      case 'performance': return '⚡ PERF';
      case 'error': return '🚨 ERR';
      case 'behavior': default: return '⚙️ BEH';
    }
  };

  const formatClockTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-48 text-center text-neutral-500 font-mono text-xs">
        <span>No security timeline records available.</span>
      </div>
    );
  }

  // Sort anomalies chronologically (oldest to newest) for a logical vertical time flow
  const sortedAnomalies = [...anomalies].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="relative p-2 pl-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
      {/* The Vertical Connecting Line */}
      <div className="absolute left-6.5 top-2 bottom-6 w-0.5 bg-neutral-800/80"></div>

      <div className="space-y-6">
        {sortedAnomalies.map((anomaly, idx) => {
          const badgeClass = getSeverityColors(anomaly.severity);
          
          return (
            <div 
              key={anomaly.id} 
              onClick={() => onSelectAnomaly(anomaly)}
              className="relative flex items-start space-x-4 cursor-pointer group select-none"
            >
              {/* Timeline Bullet (Indicator Circle) */}
              <div className={`absolute left-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 z-10 ${badgeClass}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              </div>

              {/* Event Content Container */}
              <div className="pl-6 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  {/* Timestamp */}
                  <span className="text-[10px] font-mono text-neutral-400 font-bold bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    {formatClockTime(anomaly.timestamp)}
                  </span>
                  
                  {/* Scenario / Type Badge */}
                  <span className="text-[9px] font-mono font-extrabold text-neutral-500 uppercase tracking-widest">
                    {getTimelineBadge(anomaly.type)}
                  </span>
                </div>

                {/* Short Event Summary */}
                <h5 className="text-[11px] font-bold text-neutral-200 group-hover:text-white transition-colors truncate">
                  {anomaly.summary}
                </h5>

                {/* Brief Path & Logs affected */}
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[9px] font-mono text-neutral-500 truncate max-w-[150px]">
                    {anomaly.path}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-600 bg-neutral-950 px-1.5 py-0.2 rounded border border-neutral-900">
                    {anomaly.associatedLogIds.length} logs
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
