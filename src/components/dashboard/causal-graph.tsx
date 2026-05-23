import React from 'react';
import { CausalLink } from '@/types';

interface CausalGraphProps {
  links: CausalLink[];
}

export const CausalGraph: React.FC<CausalGraphProps> = ({ links }) => {
  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-36 border border-neutral-900 bg-neutral-950/40 rounded-xl text-neutral-500 font-mono text-[10px]">
        <span>No active dependency causal chain detected.</span>
      </div>
    );
  }

  // 1. Gather all unique nodes (endpoints or services)
  const uniqueNodes = Array.from(new Set(links.flatMap(l => [l.from, l.to])));
  
  // 2. Compute dynamic circular coordinates for each node to prevent overlays
  const width = 360;
  const height = 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 55; // circular layout radius

  const nodePositions = uniqueNodes.reduce((acc, node, index) => {
    const angle = (2 * Math.PI * index) / uniqueNodes.length - Math.PI / 2; // Offset by -90deg so first node starts top
    acc[node] = {
      x: Math.round(centerX + radius * Math.cos(angle)),
      y: Math.round(centerY + radius * Math.sin(angle)),
    };
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  return (
    <div className="flex flex-col border border-neutral-900 bg-neutral-950/80 backdrop-blur-md rounded-xl p-4 shadow-md space-y-3">
      {/* Small Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
        <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest flex items-center">
          <svg className="w-3.5 h-3.5 mr-1 text-rose-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
          AI Root Cause Dependency Map
        </span>
        <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.2 rounded font-mono uppercase tracking-tighter">
          Failure Cascade Traced
        </span>
      </div>

      {/* SVG Canvas Container */}
      <div className="flex items-center justify-center bg-neutral-950 rounded-lg overflow-hidden border border-neutral-900/60 relative p-1">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto max-w-[400px]"
        >
          {/* Defs for arrowheads and glow filters */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="7"
              markerHeight="5"
              refX="16" // offset refX so arrowhead is positioned exactly outside the circle border
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 7 2.5, 0 5" fill="#f43f5e" />
            </marker>
            
            <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Draw Connecting Lines (Edges) */}
          {links.map((link, idx) => {
            const start = nodePositions[link.from];
            const end = nodePositions[link.to];
            
            if (!start || !end) return null;

            // Compute midpoint for text label positioning
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2 - 4; // offset above line

            return (
              <g key={`edge-${idx}`}>
                {/* Visual line */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                  className="animate-pulse"
                />
                
                {/* Causal Relationship Label */}
                <rect 
                  x={midX - 35} 
                  y={midY - 5} 
                  width="70" 
                  height="10" 
                  rx="3" 
                  fill="#0a0a0a" 
                  stroke="#f43f5e/20" 
                  strokeWidth="0.5" 
                />
                <text
                  x={midX}
                  y={midY + 2}
                  textAnchor="middle"
                  fill="#f43f5e"
                  className="font-mono font-bold text-[6px] tracking-tighter"
                >
                  {link.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* 2. Draw Nodes (Circles & Labels) */}
          {uniqueNodes.map((node) => {
            const pos = nodePositions[node];
            if (!pos) return null;

            // Determine if this is a root cause generator node (has arrows going OUT but not IN)
            const hasIncoming = links.some(l => l.to === node);
            const hasOutgoing = links.some(l => l.from === node);
            const isRootNode = hasOutgoing && !hasIncoming;

            return (
              <g key={`node-${node}`} className="cursor-pointer group">
                {/* Outer Glow Circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="13"
                  fill="transparent"
                  stroke={isRootNode ? '#f43f5e' : '#14b8a6'}
                  strokeWidth="1.5"
                  opacity="0.25"
                  filter="url(#glow-effect)"
                />

                {/* Inner solid circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="9"
                  fill="#0a0a0a"
                  stroke={isRootNode ? '#f43f5e' : '#14b8a6'}
                  strokeWidth="2"
                />

                {/* Root Indicator Star */}
                {isRootNode && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="3"
                    fill="#f43f5e"
                  />
                )}

                {/* Text Label Container & Background */}
                <g transform={`translate(${pos.x}, ${pos.y + 19})`}>
                  <rect
                    x="-40"
                    y="-6"
                    width="80"
                    height="11"
                    rx="3"
                    fill="#0f0f0f"
                    stroke="#ffffff/10"
                    strokeWidth="0.5"
                  />
                  <text
                    textAnchor="middle"
                    fill={isRootNode ? '#fda4af' : '#2dd4bf'}
                    className="font-mono font-bold text-[6px] select-none"
                    y="1.5"
                  >
                    {node.substring(0, 16)}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[7.5px] font-mono text-neutral-500">
        <span className="flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1"></span>
          Root Cause Source
        </span>
        <span className="flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-1"></span>
          Affected System
        </span>
      </div>
    </div>
  );
};
