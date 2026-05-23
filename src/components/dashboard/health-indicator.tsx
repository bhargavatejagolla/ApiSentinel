"use client";

import React from 'react';
import { HealthStats } from '@/types';
import GlareHover from './GlareHover';

interface HealthIndicatorProps {
  stats: HealthStats;
}

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({ stats }) => {
  const {
    overallHealthScore,
    totalRequests,
    errorRate,
    averageLatency,
    successRate,
    latencyP95,
  } = stats;

  const getHealthBg = (score: number) => {
    if (score >= 90) return 'rgba(6, 22, 18, 0.9)';
    if (score >= 70) return 'rgba(28, 20, 10, 0.9)';
    return 'rgba(30, 8, 12, 0.9)';
  };

  const getHealthBorder = (score: number) => {
    if (score >= 90) return 'rgba(16, 185, 129, 0.4)';
    if (score >= 70) return 'rgba(245, 158, 11, 0.4)';
    return 'rgba(239, 68, 68, 0.4)';
  };

  const getHealthText = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getHealthGlareColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59f0b';
    return '#ef4444';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 150) return 'text-emerald-400';
    if (latency < 400) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getErrorColor = (rate: number) => {
    if (rate < 1.0) return 'text-emerald-400';
    if (rate < 5.0) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Overall Health Score Circular Meter */}
      <GlareHover
        background={getHealthBg(overallHealthScore)}
        borderColor={getHealthBorder(overallHealthScore)}
        glareColor={getHealthGlareColor(overallHealthScore)}
        glareOpacity={0.25}
        glareSize={180}
        className="transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/40"
      >
        <div className={`p-5 flex flex-col items-center justify-center space-y-2 w-full h-full ${getHealthText(overallHealthScore)}`}>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-extrabold font-mono">API Sentinel Score</span>
          
          <div className="relative flex items-center justify-center w-20 h-20">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-neutral-900"
                strokeWidth="7"
                stroke="currentColor"
                strokeOpacity="0.15"
                fill="transparent"
                r="38"
                cx="50"
                cy="50"
              />
              <circle
                className="transition-all duration-500 ease-out drop-shadow-[0_0_8px_currentColor]"
                strokeWidth="7"
                strokeDasharray={2 * Math.PI * 38}
                strokeDashoffset={2 * Math.PI * 38 * (1 - overallHealthScore / 100)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="38"
                cx="50"
                cy="50"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold font-mono text-neutral-100">{overallHealthScore}</span>
              <span className="text-[8px] text-neutral-400 font-bold uppercase">Health</span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-center tracking-wider text-neutral-300 font-mono">
            {overallHealthScore >= 90 ? 'SYSTEM OPERATIONAL' : overallHealthScore >= 70 ? 'DEGRADED PERFORMANCE' : 'CRITICAL OUTAGE'}
          </span>
        </div>
      </GlareHover>

      {/* Metric 2: Total Requests */}
      <GlareHover
        background="rgba(10, 9, 16, 0.9)"
        borderColor="rgba(255, 255, 255, 0.08)"
        glareColor="#ffffff"
        glareOpacity={0.15}
        className="transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/40"
      >
        <div className="p-5 flex flex-col justify-between w-full h-full min-h-[140px]">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-extrabold font-mono tracking-widest uppercase mb-3">
              <span>Ingested Volume</span>
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <span className="text-3xl font-extrabold font-mono text-neutral-100 tracking-tight">{totalRequests.toLocaleString()}</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Active Log Buffer</span>
            <span className="text-neutral-500 font-extrabold">max 1,000</span>
          </div>
        </div>
      </GlareHover>

      {/* Metric 3: Average Latency */}
      <GlareHover
        background="rgba(10, 9, 16, 0.9)"
        borderColor="rgba(255, 255, 255, 0.08)"
        glareColor="#14b8a6"
        glareOpacity={0.2}
        className="transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/40"
      >
        <div className="p-5 flex flex-col justify-between w-full h-full min-h-[140px]">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-extrabold font-mono tracking-widest uppercase mb-3">
              <span>Avg Response Time</span>
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${getLatencyColor(averageLatency)}`}>
                {averageLatency}
              </span>
              <span className="text-[10px] text-neutral-500 font-bold">ms</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Target Threshold</span>
            <span className="text-neutral-500 font-extrabold">&lt; 250ms</span>
          </div>
        </div>
      </GlareHover>

      {/* Metric 4: P95 Latency */}
      <GlareHover
        background="rgba(10, 9, 16, 0.9)"
        borderColor="rgba(255, 255, 255, 0.08)"
        glareColor="#10b981"
        glareOpacity={0.2}
        className="transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/40"
      >
        <div className="p-5 flex flex-col justify-between w-full h-full min-h-[140px]">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-extrabold font-mono tracking-widest uppercase mb-3">
              <span>P95 Latency</span>
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${getLatencyColor(latencyP95)}`}>
                {latencyP95}
              </span>
              <span className="text-[10px] text-neutral-500 font-bold">ms</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>95% Experience</span>
            <span className="text-neutral-500 font-extrabold">Real-time</span>
          </div>
        </div>
      </GlareHover>

      {/* Metric 5: Failure Rate */}
      <GlareHover
        background="rgba(10, 9, 16, 0.9)"
        borderColor="rgba(255, 255, 255, 0.08)"
        glareColor="#ef4444"
        glareOpacity={0.25}
        className="transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/40"
      >
        <div className="p-5 flex flex-col justify-between w-full h-full min-h-[140px]">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-extrabold font-mono tracking-widest uppercase mb-3">
              <span>Failure Rate</span>
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${getErrorColor(errorRate)}`}>
                {errorRate}
              </span>
              <span className="text-[10px] text-neutral-500 font-bold">%</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Success SLA</span>
            <span className="text-emerald-400 font-extrabold">{successRate}%</span>
          </div>
        </div>
      </GlareHover>
    </div>
  );
};
