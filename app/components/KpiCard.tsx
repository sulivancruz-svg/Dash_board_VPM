'use client';

import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function KpiCard({ title, value, subtitle, icon, trend, className = '' }: KpiCardProps) {
  const trendColor =
    trend?.direction === 'up' ? 'text-emerald-300' : trend?.direction === 'down' ? 'text-rose-300' : 'text-slate-300';

  return (
    <div className={`bg-[#0B2440] border border-cyan-400/15 rounded shadow-[0_14px_35px_rgba(0,0,0,0.24)] p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-cyan-100/70 text-xs font-semibold uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black text-white mt-2 leading-tight break-words">{value}</p>
          {subtitle && <p className="text-cyan-100/60 text-sm mt-2">{subtitle}</p>}
        </div>
        {icon && <div className="text-2xl text-emerald-300">{icon}</div>}
      </div>
      {trend && (
        <div className={`mt-4 text-sm font-bold ${trendColor}`}>
          {trend.direction === 'up' && '↑ '}
          {trend.direction === 'down' && '↓ '}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );
}
