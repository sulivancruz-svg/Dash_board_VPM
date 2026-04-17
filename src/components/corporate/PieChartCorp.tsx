'use client';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

interface PieData {
  name: string;
  value: number;
}

interface PieChartCorpProps {
  data: PieData[];
  dataKey?: string;
  height?: number;
}

export function PieChartCorp({ data, dataKey = 'value', height = 300 }: PieChartCorpProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={dataKey} cx="50%" cy="50%" labelLine outerRadius={80}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
