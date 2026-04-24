'use client';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#00d9ff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#a78bfa', '#fb7185'];

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
        <Pie
          data={data}
          dataKey={dataKey}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={90}
          innerRadius={45}
          paddingAngle={2}
          isAnimationActive={true}
          animationDuration={800}
        >
          {data.map((_, idx) => (
            <Cell
              key={idx}
              fill={COLORS[idx % COLORS.length]}
              opacity={0.85}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(100, 200, 255, 0.3)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
          labelStyle={{ color: 'rgba(226, 232, 240, 0.9)' }}
        />
        <Legend
          wrapperStyle={{ color: 'rgba(148, 163, 184, 0.8)' }}
          verticalAlign="bottom"
          height={36}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
