'use client';

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: number;
  format?: 'currency' | 'number' | 'percent';
}

export function MetricCard({ label, value, change, format = 'number' }: MetricCardProps) {
  const formatted = format === 'currency'
    ? `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : format === 'percent'
    ? `${Number(value).toFixed(1)}%`
    : Number(value).toLocaleString('pt-BR');

  const changeColor = change ? change >= 0 ? 'text-green-600' : 'text-red-600' : '';

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <div className="text-2xl font-bold text-gray-900">{formatted}</div>
      {change !== undefined && (
        <p className={`text-sm mt-2 ${changeColor}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
