import React, { useState, useMemo } from 'react';
import { APILog } from '@/types';

interface LogStreamProps {
  logs: APILog[];
  onSelectLog: (log: APILog) => void;
}

export const LogStream: React.FC<LogStreamProps> = ({ logs, onSelectLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter logs based on search and dropdown selections
  const filteredLogs = useMemo(() => {
    // Reverse logs so the absolute newest logs appear at the top of the terminal feed
    const sortedLogs = [...logs].reverse();

    return sortedLogs.filter(log => {
      // 1. Search term match (checks path, IP, User Agent, status, method, or payload)
      const matchesSearch = 
        log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.clientIp.includes(searchTerm) ||
        log.userAgent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.status.toString().includes(searchTerm) ||
        log.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.errorMessage && log.errorMessage.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Method filter match
      const matchesMethod = methodFilter === 'ALL' || log.method === methodFilter;

      // 3. Status filter match
      let matchesStatus = true;
      if (statusFilter === '2XX') matchesStatus = log.status >= 200 && log.status < 300;
      else if (statusFilter === '4XX') matchesStatus = log.status >= 400 && log.status < 500;
      else if (statusFilter === '5XX') matchesStatus = log.status >= 500 && log.status < 600;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [logs, searchTerm, methodFilter, statusFilter]);

  const getMethodBadgeClass = (method: APILog['method']) => {
    switch (method) {
      case 'GET': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'POST': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PUT': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DELETE': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
    }
  };

  const getStatusColor = (status: number) => {
    if (status < 300) return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20';
    if (status < 500) return 'text-amber-400 bg-amber-500/5 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/5 border-rose-500/20 animate-pulse';
  };

  const formatTimestamp = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
      '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  return (
    <div className="flex flex-col h-[580px] rounded-2xl border border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.3)] overflow-hidden">
      {/* Terminal Header / Controls */}
      <div className="p-4 bg-neutral-900/60 border-b border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Neon terminal circles */}
          <div className="flex space-x-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
          <span className="font-mono text-xs font-semibold text-neutral-300 tracking-wider">LIVE_INGEST_STREAM</span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono tracking-tighter animate-pulse">
            FEED_ACTIVE
          </span>
        </div>

        {/* Searching & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Search box */}
          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Search stream..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
            />
            <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 focus:outline-none focus:border-neutral-700 cursor-pointer"
          >
            <option value="ALL">ANY METHOD</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 focus:outline-none focus:border-neutral-700 cursor-pointer"
          >
            <option value="ALL">ANY STATUS</option>
            <option value="2XX">2XX SUCCESS</option>
            <option value="4XX">4XX CLIENT ERR</option>
            <option value="5XX">5XX SERVER ERR</option>
          </select>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed select-text scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-2">
            <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span className="text-xs">No matching API logs in buffer. Trigger traffic to populate stream.</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-900/60 pb-1 text-[10px]">
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-2">METHOD</th>
                <th className="py-2 px-2">STATUS</th>
                <th className="py-2 px-3">LATENCY</th>
                <th className="py-2 px-3">ENDPOINT</th>
                <th className="py-2 px-3 hidden lg:table-cell">CLIENT IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => onSelectLog(log)}
                  className="hover:bg-neutral-900/50 rounded cursor-pointer transition-colors duration-150 group border-b border-neutral-900/40"
                >
                  {/* Timestamp */}
                  <td className="py-1.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  
                  {/* Method */}
                  <td className="py-1.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodBadgeClass(log.method)}`}>
                      {log.method}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-1.5 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>

                  {/* Latency */}
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <span className={log.latency > 1000 ? 'text-rose-400 font-bold' : log.latency > 300 ? 'text-amber-400' : 'text-neutral-400'}>
                      {log.latency} ms
                    </span>
                  </td>

                  {/* Endpoint Path */}
                  <td className="py-1.5 px-3 text-neutral-300 font-semibold max-w-xs md:max-w-md truncate group-hover:text-neutral-100">
                    {log.path}
                  </td>

                  {/* Client IP */}
                  <td className="py-1.5 px-3 text-neutral-500 font-mono hidden lg:table-cell whitespace-nowrap">
                    {log.clientIp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="p-3 bg-neutral-900/40 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-400">
        <span>Streaming Buffer: <strong className="text-neutral-200">{filteredLogs.length}</strong> / {logs.length} logs shown</span>
        <span>Click any row to inspect complete metadata payload</span>
      </div>
    </div>
  );
};
