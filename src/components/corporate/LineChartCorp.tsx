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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
        <Legend />
        {lines.map(line => (
          <Line key={line.dataKey} type="monotone" {...line} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
