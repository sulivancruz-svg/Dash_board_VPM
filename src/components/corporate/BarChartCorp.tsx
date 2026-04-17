'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface BarChartCorpProps {
  data: DataPoint[];
  dataKey: string;
  height?: number;
  layout?: 'vertical' | 'horizontal';
}

export function BarChartCorp({ data, dataKey, height = 300, layout = 'horizontal' }: BarChartCorpProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type={layout === 'vertical' ? 'number' : 'category'} />
        <YAxis dataKey="name" type={layout === 'vertical' ? 'category' : 'number'} width={140} />
        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
        <Legend />
        <Bar dataKey={dataKey} fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
