'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/format';

interface LineChartComponentProps {
  data: any[];
  title: string;
  lines: Array<{
    key: string;
    label: string;
    color: string;
  }>;
  height?: number;
  formatYAxis?: 'currency' | 'number';
}

export function LineChartComponent({ data, title, lines, height = 300, formatYAxis = 'number' }: LineChartComponentProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
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
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              name={line.label}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
