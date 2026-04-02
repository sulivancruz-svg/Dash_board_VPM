'use client';

import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { kpiTokens, textColors } from '@/lib/design-tokens';

interface KpiCardProps {
  label: string;
  value: string | number;
  format?: 'currency' | 'percentage' | 'number';
  delta?: {
    value: number;
    direction: 'up' | 'down';
  };
  Icon?: LucideIcon;
  accentColor?: 'success' | 'warning' | 'critical' | 'info' | 'neutral';
}

export function KpiCard({
  label,
  value,
  format = 'number',
  delta,
  Icon,
  accentColor = 'info',
}: KpiCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('pt-BR').format(val as number);
    }
  };

  const isPositive = delta?.direction === 'up';
  const deltaColor = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
  const deltaIcon = isPositive ? (
    <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
  ) : (
    <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
  );

  return (
    <div className={`${kpiTokens.card.base} overflow-hidden ${kpiTokens.card.hover}`}>
      <div className={`h-1 w-full ${kpiTokens.card.accentBar[accentColor]}`} />
      <div className="px-5 py-4">
        <div className="flex items-start justify-between mb-3">
          <p className={textColors.label}>{label}</p>
          {Icon && (
            <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
          )}
        </div>
        <p className={textColors.value}>{formatValue(value)}</p>
        {delta && (
          <div className={`flex items-center gap-1 mt-2 ${deltaColor}`}>
            {deltaIcon}
            <span className="text-xs font-semibold">{Math.abs(delta.value).toFixed(1)}%</span>
            <span className={`text-xs font-normal ${textColors.tertiary}`}>vs período anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}
