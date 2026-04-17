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
  const trendColor = trend?.direction === 'up' ? 'text-green-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-gray-500 text-sm mt-2">{subtitle}</p>}
        </div>
        {icon && <div className="text-2xl text-gray-400">{icon}</div>}
      </div>
      {trend && (
        <div className={`mt-4 text-sm font-medium ${trendColor}`}>
          {trend.direction === 'up' && '↑ '} {trend.direction === 'down' && '↓ '} {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );
}
