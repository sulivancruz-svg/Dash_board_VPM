'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  XCircle, Brain, BarChart2, Loader, RefreshCw,
} from 'lucide-react';
import type { IntelligenceData, MetricSeries, CohortRow, ChannelCohort } from '@/app/api/data/intelligence/route';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtNum(v: number) {
  return v.toLocaleString('pt-BR');
}
function fmtPct(v: number) {
  return `${v > 0 ? '+' : ''}${v}%`;
}

// ── Mini Sparkline ────────────────────────────────────────────────────────────

function Sparkline({ series, mean, color }: { series: number[]; mean: number; color: string }) {
  if (series.length < 2) return null;
  const max = Math.max(...series, mean * 1.1);
  const min = Math.min(...series, mean * 0.9);
  const range = max - min || 1;
  const W = 120;
  const H = 40;

  const toX = (i: number) => (i / (series.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * H;
  const pts = series.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const meanY = toY(mean);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
      {/* Banda da média */}
      <line x1={0} y1={meanY} x2={W} y2={meanY} stroke="#94a3b8" strokeDasharray="3 2" strokeWidth={1} opacity={0.6} />
      {/* Linha de dados */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Último ponto */}
      <circle cx={toX(series.length - 1)} cy={toY(series[series.length - 1])} r={3} fill={color} />
    </svg>
  );
}

// ── Status Config ─────────────────────────────────────────────────────────────

const statusConfig = {
  ok: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Normal',
    sparkColor: '#10b981',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Atenção',
    sparkColor: '#f59e0b',
  },
  anomaly: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    label: 'Anomalia',
    sparkColor: '#ef4444',
  },
};

const trendConfig = {
  growing: { icon: TrendingUp, color: 'text-emerald-600', label: 'Crescendo' },
  declining: { icon: TrendingDown, color: 'text-red-500', label: 'Caindo' },
  stable: { icon: Minus, color: 'text-slate-400', label: 'Estável' },
};

const attrColors: Record<string, string> = {
  PAID_MEDIA: 'bg-blue-100 text-blue-700',
  ORGANIC_COMMERCIAL: 'bg-amber-100 text-amber-700',
  BRAND_BASE: 'bg-violet-100 text-violet-700',
  UNKNOWN: 'bg-slate-100 text-slate-500',
};
const attrLabels: Record<string, string> = {
  PAID_MEDIA: 'Mídia Paga',
  ORGANIC_COMMERCIAL: 'Orgânico',
  BRAND_BASE: 'Branding',
  UNKNOWN: 'Não inf.',
};

// ── Anomaly Card ──────────────────────────────────────────────────────────────

function AnomalyCard({ metric }: { metric: MetricSeries }) {
  const cfg = statusConfig[metric.status];
  const Icon = cfg.icon;
  const values = metric.series.map(s => s.value);
  const dirIcon = metric.direction === 'up'
    ? <TrendingUp className="w-3.5 h-3.5" />
    : metric.direction === 'down'
      ? <TrendingDown className="w-3.5 h-3.5" />
      : <Minus className="w-3.5 h-3.5" />;

  const fmt = metric.unit === 'currency' ? fmtCurrency : metric.unit === 'percent' ? (v: number) => `${v}%` : fmtNum;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{metric.label}</p>
          <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>{fmt(metric.latest)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{metric.latestLabel} · último período</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Icon className={`w-5 h-5 ${cfg.color}`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline series={values} mean={metric.mean} color={cfg.sparkColor} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Média</p>
          <p className="text-xs font-semibold text-slate-700">{fmt(metric.mean)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">vs. Média</p>
          <p className={`text-xs font-semibold flex items-center gap-0.5 ${metric.direction === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {dirIcon}
            {fmtPct(metric.changeVsMean)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Z-Score</p>
          <p className={`text-xs font-semibold ${cfg.color}`}>{metric.zScore > 0 ? '+' : ''}{metric.zScore}σ</p>
        </div>
      </div>
    </div>
  );
}

// ── Cohort Month Row ──────────────────────────────────────────────────────────

function CohortMonthRow({ cohort, maxReceita }: { cohort: CohortRow; maxReceita: number }) {
  const pct = maxReceita > 0 ? (cohort.receita / maxReceita) * 100 : 0;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm font-semibold text-slate-700 capitalize whitespace-nowrap">
        {cohort.month}/{cohort.year}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-semibold text-slate-800 whitespace-nowrap w-28 text-right">
            {fmtCurrency(cohort.receita)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 text-center">{cohort.deals}</td>
      <td className="px-4 py-3 text-sm font-medium text-slate-700 text-right">{fmtCurrency(cohort.ticketMedio)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {cohort.channels.slice(0, 3).map(ch => (
            <span key={ch.canal} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {ch.canal}
            </span>
          ))}
          {cohort.channels.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
              +{cohort.channels.length - 3}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Channel Cohort Card ───────────────────────────────────────────────────────

function ChannelCard({ ch, grandTotal }: { ch: ChannelCohort; grandTotal: number }) {
  const TrendIcon = trendConfig[ch.trend].icon;
  const pctBar = grandTotal > 0 ? (ch.totalReceita / grandTotal) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${attrColors[ch.attribution] || attrColors.UNKNOWN}`}>
              {attrLabels[ch.attribution] || 'Outro'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-800">{ch.canal}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${trendConfig[ch.trend].color}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          {ch.trendPct > 0 ? '+' : ''}{ch.trendPct}%
        </span>
      </div>

      {/* Barra de participação */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>Participação na receita</span>
          <span className="font-semibold text-slate-600">{ch.pctReceita}%</span>
        </div>
        <div className="bg-slate-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pctBar}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Receita</p>
          <p className="text-xs font-bold text-slate-800">{fmtCurrency(ch.totalReceita)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Deals</p>
          <p className="text-xs font-bold text-slate-800">{ch.totalDeals}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ticket</p>
          <p className="text-xs font-bold text-slate-800">{fmtCurrency(ch.ticketMedio)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/data/intelligence', { cache: 'no-store' });
      if (!res.ok) throw new Error('Erro ao buscar dados de inteligência');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Inteligência</h1>
            <p className="text-sm text-slate-500">Análise automatizada dos seus dados reais</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-3 text-sm text-slate-500">Analisando dados...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Sem dados */}
      {!loading && !error && data && !data.hasData && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-700 mb-2">Dados insuficientes</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Importe dados do Pipedrive e SDR para ativar a análise de inteligência.
          </p>
        </div>
      )}

      {!loading && !error && data && data.hasData && (
        <>
          {/* ── Seção 1: Radar de Anomalias ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Radar de Anomalias</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detecta quando uma métrica sai do padrão histórico (Z-score ≥ 1.2σ = atenção · ≥ 2σ = anomalia)
                </p>
              </div>
              {data.anomalies.totalAlerts > 0 && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
                  {data.anomalies.totalAlerts} alerta{data.anomalies.totalAlerts > 1 ? 's' : ''}
                </span>
              )}
              {data.anomalies.totalAlerts === 0 && data.anomalies.metrics.length > 0 && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  Tudo normal
                </span>
              )}
            </div>

            {data.anomalies.metrics.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                Precisamos de ao menos 3 meses de dados para detectar anomalias.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.anomalies.metrics.map(m => (
                  <AnomalyCard key={m.label} metric={m} />
                ))}
              </div>
            )}

            {/* Alertas detalhados */}
            {data.anomalies.alerts.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.anomalies.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                      alert.severity === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {alert.severity === 'critical'
                      ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <span>{alert.message}</span>
                    <span className="ml-auto font-mono text-xs opacity-60 whitespace-nowrap">
                      z={alert.zScore > 0 ? '+' : ''}{alert.zScore}σ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Seção 2: Cohort Analysis ─────────────────────────────────────── */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-800">Análise de Cohort</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clientes agrupados por mês de entrada — receita, volume e ticket médio por cohort e canal
              </p>
            </div>

            {/* Por canal */}
            {data.cohorts.byChannel.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Performance por Canal
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {data.cohorts.byChannel.slice(0, 8).map(ch => (
                    <ChannelCard
                      key={ch.canal}
                      ch={ch}
                      grandTotal={data.cohorts.byChannel.reduce((s, c) => s + c.totalReceita, 0)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Por mês */}
            {data.cohorts.byMonth.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Evolução Mensal dos Cohorts
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohort</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Deals</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Canais</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[...data.cohorts.byMonth].reverse().map(cohort => (
                        <CohortMonthRow
                          key={cohort.monthKey}
                          cohort={cohort}
                          maxReceita={Math.max(...data.cohorts.byMonth.map(c => c.receita))}
                        />
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">Total</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 pr-8 text-right">
                          {fmtCurrency(data.cohorts.byMonth.reduce((s, c) => s + c.receita, 0))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 text-center">
                          {data.cohorts.byMonth.reduce((s, c) => s + c.deals, 0)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                          {(() => {
                            const totalReceita = data.cohorts.byMonth.reduce((s, c) => s + c.receita, 0);
                            const totalDeals = data.cohorts.byMonth.reduce((s, c) => s + c.deals, 0);
                            return fmtCurrency(totalDeals > 0 ? Math.round(totalReceita / totalDeals) : 0);
                          })()}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {data.cohorts.byMonth.length === 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                Nenhum dado de cohort disponível. Importe dados do Pipedrive para ativar esta análise.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
