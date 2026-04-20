'use client';

import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/format';

interface PieChartComponentProps {
  data: Array<{ name: string; value: number; revenue?: number }>;
  title: string;
  height?: number;
  valueLabel?: string;
}

const COLORS = ['#10B981', '#38BDF8', '#FBBF24', '#A78BFA', '#FB7185', '#2DD4BF', '#F97316', '#93C5FD'];

export function PieChartComponent({ data, title, height = 320, valueLabel = 'Vendas' }: PieChartComponentProps) {
  return (
    <div className="rounded border border-cyan-400/15 bg-[#0B2440] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
      <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={105}
            paddingAngle={2}
            label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#061427', border: '1px solid rgba(34,211,238,0.25)', color: '#EAF2FF' }}
            labelStyle={{ color: '#EAF2FF' }}
            formatter={(value: any, name: any, props: any) => [
              `${Number(value).toLocaleString('pt-BR')} ${valueLabel.toLowerCase()}${
                props?.payload?.revenue ? ` | ${formatCurrency(props.payload.revenue)}` : ''
              }`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ color: '#B9D7F3', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
