'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  [key: string]: string | number;
}

interface LineChartCorpProps {
  data: DataPoint[];
  lines: Array<{ dataKey: string; stroke: string; name: string }>;
  height?: number;
}

export function LineChartCorp({ data, lines, height = 300 }: LineChartCorpProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
        <XAxis
          dataKey="month"
          stroke="rgba(148, 163, 184, 0.5)"
          style={{ fontSize: '12px' }}
        />
        <YAxis
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
          cursor={{ stroke: 'rgba(0, 217, 255, 0.3)', strokeWidth: 1 }}
        />
        <Legend
          wrapperStyle={{ color: 'rgba(148, 163, 184, 0.8)' }}
          iconType="line"
        />
        {lines.map(line => (
          <Line
            key={line.dataKey}
            type="monotone"
            {...line}
            strokeWidth={2.5}
            dot={{ r: 4, fill: line.stroke, opacity: 0.7 }}
            activeDot={{ r: 6, opacity: 1 }}
            isAnimationActive={true}
            animationDuration={800}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
