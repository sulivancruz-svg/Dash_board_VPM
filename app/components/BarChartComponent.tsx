'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/format';

interface BarChartComponentProps {
  data: any[];
  title: string;
  bars: Array<{
    key: string;
    label: string;
    color: string;
    yAxisId?: 'left' | 'right';
  }>;
  height?: number;
  formatYAxis?: 'currency' | 'number';
}

export function BarChartComponent({ data, title, bars, height = 300, formatYAxis = 'number' }: BarChartComponentProps) {
  const hasRightAxis = bars.some((bar) => bar.yAxisId === 'right');

  return (
    <div className="rounded border border-cyan-400/15 bg-[#0B2440] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
      <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: hasRightAxis ? 24 : 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
          <XAxis dataKey="name" tick={{ fill: '#B9D7F3', fontSize: 12 }} axisLine={{ stroke: '#234B70' }} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#B9D7F3', fontSize: 12 }}
            axisLine={{ stroke: '#234B70' }}
            tickLine={false}
            tickFormatter={(value) =>
              formatYAxis === 'currency' ? `R$ ${(value / 1000).toFixed(0)}k` : value.toLocaleString('pt-BR')
            }
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#B9D7F3', fontSize: 12 }}
              axisLine={{ stroke: '#234B70' }}
              tickLine={false}
              tickFormatter={(value) => value.toLocaleString('pt-BR')}
            />
          )}
          <Tooltip
            contentStyle={{ background: '#061427', border: '1px solid rgba(34,211,238,0.25)', color: '#EAF2FF' }}
            labelStyle={{ color: '#EAF2FF' }}
            formatter={(value: any, name: any) => {
              const label = String(name);
              return label.toLowerCase().includes('faturamento') || label.toLowerCase().includes('receita')
                ? formatCurrency(value)
                : value.toLocaleString('pt-BR');
            }}
          />
          <Legend wrapperStyle={{ color: '#B9D7F3' }} />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              yAxisId={bar.yAxisId || 'left'}
              fill={bar.color}
              name={bar.label}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
