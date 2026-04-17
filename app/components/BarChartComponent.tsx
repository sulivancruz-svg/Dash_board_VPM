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
  }>;
  height?: number;
  formatYAxis?: 'currency' | 'number';
}

export function BarChartComponent({ data, title, bars, height = 300, formatYAxis = 'number' }: BarChartComponentProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis
            tickFormatter={(value) =>
              formatYAxis === 'currency'
                ? `R$ ${(value / 1000).toFixed(0)}k`
                : value.toLocaleString('pt-BR')
            }
          />
          <Tooltip
            formatter={(value: any) =>
              formatYAxis === 'currency' ? formatCurrency(value) : value.toLocaleString('pt-BR')
            }
            labelFormatter={(label) => `${label}`}
          />
          <Legend />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color}
              name={bar.label}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
