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

  const changeColor = change && change >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="relative group">
      {/* Gradient border glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-75 transition-opacity duration-300 blur" />

      {/* Card */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 backdrop-blur-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
        <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          {formatted}
        </div>
        {change !== undefined && (
          <div className={`text-xs font-semibold mt-3 flex items-center gap-1 ${changeColor}`}>
            <span className={change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {change >= 0 ? '↑' : '↓'}
            </span>
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
