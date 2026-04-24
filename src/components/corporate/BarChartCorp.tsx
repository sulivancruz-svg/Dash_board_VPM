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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
        <XAxis
          type={layout === 'vertical' ? 'number' : 'category'}
          stroke="rgba(148, 163, 184, 0.5)"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          dataKey="name"
          type={layout === 'vertical' ? 'category' : 'number'}
          width={140}
          stroke="rgba(148, 163, 184, 0.5)"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(100, 200, 255, 0.3)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
          labelStyle={{ color: 'rgba(226, 232, 240, 0.9)' }}
          cursor={{ fill: 'rgba(0, 217, 255, 0.15)' }}
        />
        <Legend wrapperStyle={{ color: 'rgba(148, 163, 184, 0.8)' }} />
        <Bar
          dataKey={dataKey}
          fill="url(#gradientBar)"
          radius={[8, 8, 0, 0]}
          isAnimationActive={true}
          animationDuration={800}
        />
        <defs>
          <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d9ff" stopOpacity={1} />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#ec4899" stopOpacity={0.6} />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
