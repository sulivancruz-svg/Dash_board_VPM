'use client';

import { useEffect, useState } from 'react';
import {
  Brain, Loader, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, XCircle, BarChart2,
} from 'lucide-react';
import type {
  IntelligenceData, ChannelRanking, TemporalChannel,
  GoogleProjection, EfficiencyScore, AnomalyMetric,
} from '@/app/api/data/intelligence/route';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';

// ── Formatters ────────────────────────────────────────────────────────────────

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const NUM = (v: number) => v.toLocaleString('pt-BR');
const PCT = (v: number) => `${v > 0 ? '+' : ''}${v}%`;

// ── Cores por attribution ─────────────────────────────────────────────────────
const ATTR_BADGE: Record<string, string> = {
  PAID_MEDIA:         'bg-blue-100 text-blue-700',
  ORGANIC_COMMERCIAL: 'bg-amber-100 text-amber-700',
  BRAND_BASE:         'bg-violet-100 text-violet-700',
  UNKNOWN:            'bg-slate-100 text-slate-500',
};
const ATTR_LABEL: Record<string, string> = {
  PAID_MEDIA: 'Mídia Paga', ORGANIC_COMMERCIAL: 'Relacionamento Comercial',
  BRAND_BASE: 'Branding', UNKNOWN: 'Não inf.',
};

// ── Mini Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ values, color = '#6366f1' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 80; const H = 28;
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-20">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8}
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(W)} cy={H - ((values[values.length-1] - min) / range) * H}
        r={2.5} fill={color} />
    </svg>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEÇÃO 1 — Ranking de Canais (por ticket médio)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ChannelRankingSection({ channels }: { channels: ChannelRanking[] }) {
  const [sort, setSort] = useState<'ticket' | 'receita'>('ticket');
  const sorted = [...channels].sort((a, b) =>
    sort === 'ticket' ? b.ticketMedio - a.ticketMedio : b.receita - a.receita);
  const maxTicket  = Math.max(...channels.map(c => c.ticketMedio), 1);
  const maxReceita = Math.max(...channels.map(c => c.receita), 1);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Qual canal traz clientes de maior valor?
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ticket médio e receita total por canal de origem
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['ticket','receita'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${sort === s ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'ticket' ? 'Ticket' : 'Receita'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-6">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Canal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[180px]">
                {sort === 'ticket' ? 'Ticket Médio' : 'Receita Total'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {sort === 'ticket' ? 'Receita' : 'Ticket'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Deals</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">% Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((ch, i) => {
              const barPct = sort === 'ticket'
                ? (ch.ticketMedio / maxTicket) * 100
                : (ch.receita / maxReceita) * 100;
              const barValue = sort === 'ticket' ? ch.ticketMedio : ch.receita;
              const otherValue = sort === 'ticket' ? ch.receita : ch.ticketMedio;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              return (
                <tr key={ch.canal} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-slate-400">{medal ?? i + 1}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{ch.canal}</p>
                      <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ATTR_BADGE[ch.attribution] ?? ATTR_BADGE.UNKNOWN}`}>
                        {ATTR_LABEL[ch.attribution] ?? 'Outro'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[80px]">
                        <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                        {BRL(barValue)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right whitespace-nowrap">
                    {BRL(otherValue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right">{NUM(ch.deals)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-slate-500">{ch.pctReceita}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEÇÃO 2 — Evolução Temporal por Canal (heatmap)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TemporalSection({ channels, allMonthKeys }: { channels: TemporalChannel[]; allMonthKeys: string[] }) {
  const [view, setView] = useState<'receita' | 'deals' | 'ticket'>('receita');

  // Valor máximo global (para normalizar intensidade das células)
  const allValues = channels.flatMap(ch =>
    ch.cells.map(c => view === 'receita' ? c.receita : view === 'deals' ? c.deals : c.ticketMedio));
  const maxVal = Math.max(...allValues, 1);

  const cellIntensity = (v: number) => Math.min(v / maxVal, 1);

  const cellBg = (v: number) => {
    const i = cellIntensity(v);
    if (i === 0) return 'bg-slate-50 text-slate-300';
    if (i < 0.2)  return 'bg-indigo-50 text-indigo-400';
    if (i < 0.4)  return 'bg-indigo-100 text-indigo-600';
    if (i < 0.6)  return 'bg-indigo-200 text-indigo-700';
    if (i < 0.8)  return 'bg-indigo-300 text-indigo-800';
    return 'bg-indigo-500 text-white font-bold';
  };

  const fmt = (c: TemporalChannel['cells'][0]) =>
    view === 'receita' ? BRL(c.receita) : view === 'deals' ? String(c.deals) : BRL(c.ticketMedio);

  // Últimos 6 meses
  const visibleMonths = allMonthKeys.slice(-6);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Quem está crescendo ou caindo por canal?
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evolução mês a mês por canal — baseada na data de criação da oportunidade no Pipedrive
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['receita','deals','ticket'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {v === 'receita' ? 'Receita' : v === 'deals' ? 'Deals' : 'Ticket'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 min-w-[200px]">
                  Canal
                </th>
                {visibleMonths.map(mk => {
                  const [y, m] = mk.split('-').map(Number);
                  const labels: Record<number,string> = {1:'jan',2:'fev',3:'mar',4:'abr',5:'mai',6:'jun',7:'jul',8:'ago',9:'set',10:'out',11:'nov',12:'dez'};
                  return (
                    <th key={mk} className="px-3 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {labels[m]}/{String(y).slice(2)}
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tendência
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {channels.map(ch => {
                const visibleCells = ch.cells.filter(c => visibleMonths.includes(c.monthKey));
                const revenues = visibleCells.map(c => c.receita);
                const lastTwo  = revenues.slice(-2);
                const trend    = lastTwo.length === 2
                  ? lastTwo[1] > lastTwo[0] ? 'up' : lastTwo[1] < lastTwo[0] ? 'down' : 'stable'
                  : 'stable';

                return (
                  <tr key={ch.canal} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50/50">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{ch.canal}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ATTR_BADGE[ch.attribution] ?? ATTR_BADGE.UNKNOWN}`}>
                        {ATTR_LABEL[ch.attribution] ?? 'Outro'}
                      </span>
                    </td>
                    {visibleMonths.map(mk => {
                      const cell = visibleCells.find(c => c.monthKey === mk) ?? { receita: 0, deals: 0, ticketMedio: 0, monthKey: mk, monthLabel: '' };
                      const val  = view === 'receita' ? cell.receita : view === 'deals' ? cell.deals : cell.ticketMedio;
                      return (
                        <td key={mk} className={`px-3 py-3 text-center text-xs transition-colors rounded-sm mx-0.5 ${cellBg(val)}`}>
                          {val > 0 ? fmt(cell) : '—'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Sparkline values={revenues} color={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#94a3b8'} />
                        {trend === 'up'
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          : trend === 'down'
                            ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            : <Minus className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEÇÃO 3 — Projeção Google
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GoogleProjectionSection({ proj }: { proj: GoogleProjection }) {
  if (!proj.hasEnoughData) {
    return (
      <section>
        <h2 className="text-base font-bold text-slate-800 mb-1">
          Se eu investir mais no Google, o que acontece?
        </h2>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Precisamos de ao menos 3 meses de investimento no Google para calcular a projeção.
        </div>
      </section>
    );
  }

  const { forecast, roiHistorico, regression, points } = proj;
  const baseScenario = forecast[1]; // 1x = média histórica

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-800">
          Se eu investir mais no Google, o que acontece?
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Projeção baseada em regressão linear do histórico real
          {' '}· R² = {regression.r2} (quanto mais próximo de 1, mais confiável)
        </p>
      </div>

      {/* Contexto histórico */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">ROI Histórico</p>
          <p className="text-2xl font-bold text-indigo-700">{roiHistorico}x</p>
          <p className="text-xs text-slate-500 mt-1">cada R$ 1 investido gerou R$ {roiHistorico} em oportunidades</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Meses analisados</p>
          <p className="text-2xl font-bold text-slate-700">{points.length}</p>
          <p className="text-xs text-slate-500 mt-1">pares investimento × receita disponíveis</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Confiança</p>
          <p className={`text-2xl font-bold ${regression.r2 >= 0.7 ? 'text-emerald-600' : regression.r2 >= 0.4 ? 'text-amber-600' : 'text-red-500'}`}>
            {regression.r2 >= 0.7 ? 'Alta' : regression.r2 >= 0.4 ? 'Média' : 'Baixa'}
          </p>
          <p className="text-xs text-slate-500 mt-1">R² = {regression.r2}</p>
        </div>
      </div>

      {/* Cenários */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cenários de investimento</p>
        </div>
        <table className="w-full">
          <thead className="border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Cenário</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Investimento</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Receita esperada</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">ROI projetado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {forecast.map((f, i) => {
              const labels = ['Metade', 'Atual (base)', '+50%', 'Dobro', 'Triplo'];
              const isBase = i === 1;
              return (
                <tr key={i} className={isBase ? 'bg-indigo-50' : 'hover:bg-slate-50'}>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-semibold ${isBase ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {labels[i]}
                    </span>
                    {isBase && (
                      <span className="ml-2 text-[10px] bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">
                        referência
                      </span>
                    )}
                  </td>
                  <td className={`px-5 py-3.5 text-sm text-right ${isBase ? 'font-bold text-indigo-700' : 'text-slate-600'}`}>
                    {BRL(f.invest)}
                  </td>
                  <td className={`px-5 py-3.5 text-sm text-right font-bold ${isBase ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {BRL(f.receitaEsperada)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-bold ${f.roi >= 3 ? 'text-emerald-600' : f.roi >= 1.5 ? 'text-amber-600' : 'text-red-500'}`}>
                      {f.roi}x
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            ⚠️ Projeção baseada em correlação histórica. Não considera saturação de mercado, sazonalidade ou concorrência.
          </p>
        </div>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEÇÃO 4 — Score de Eficiência (apenas paid)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EfficiencySection({ scores }: { scores: EfficiencyScore[] }) {
  if (scores.length === 0) {
    return (
      <section>
        <h2 className="text-base font-bold text-slate-800 mb-1">Score de Eficiência — Canais Pagos</h2>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Conecte Google Ads e Meta Ads para ver o score de eficiência por canal pago.
        </div>
      </section>
    );
  }

  const maxRoi = Math.max(...scores.map(s => s.roi), 1);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-800">Qual canal pago é mais eficiente?</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Receita gerada por real investido — ROI = receita atribuída ÷ investimento real
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {scores.map(s => {
          const roiBar = (s.roi / maxRoi) * 100;
          const roiColor = s.roi >= 3 ? 'text-emerald-600' : s.roi >= 1.5 ? 'text-amber-600' : 'text-red-500';
          const barColor = s.roi >= 3 ? 'bg-emerald-500' : s.roi >= 1.5 ? 'bg-amber-400' : 'bg-red-400';

          return (
            <div key={s.canal} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${s.tipo === 'google' ? 'bg-blue-500' : 'bg-rose-500'}`}>
                    {s.tipo === 'google' ? 'G' : 'M'}
                  </div>
                  <p className="text-sm font-bold text-slate-800">{s.canal}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${roiColor}`}>{s.roiLabel}</p>
                  <p className="text-[10px] text-slate-400">por real investido</p>
                </div>
              </div>

              {/* Barra de ROI */}
              <div className="mb-4">
                <div className="bg-slate-100 rounded-full h-2">
                  <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${roiBar}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Investido</p>
                  <p className="text-sm font-bold text-slate-700">
                    {s.investimento > 0 ? BRL(s.investimento) : 'N/D'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Receita</p>
                  <p className="text-sm font-bold text-slate-700">{BRL(s.receita)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Deals</p>
                  <p className="text-sm font-bold text-slate-700">{s.deals}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ticket Médio</p>
                  <p className="text-sm font-bold text-slate-700">{BRL(s.ticketMedio)}</p>
                </div>
                {s.cpa > 0 && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Custo por Deal (CPA)</p>
                    <p className="text-sm font-bold text-slate-700">{BRL(s.cpa)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEÇÃO 5 — Radar de Anomalias
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const STATUS_CFG = {
  ok:      { icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'Normal',   spark: '#10b981' },
  warning: { icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   label: 'Atenção',  spark: '#f59e0b' },
  anomaly: { icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',    badge: 'bg-red-100 text-red-700',       label: 'Anomalia', spark: '#ef4444' },
};

function AnomalyCard({ m }: { m: AnomalyMetric }) {
  const cfg  = STATUS_CFG[m.status];
  const Icon = cfg.icon;
  const fmt  = m.unit === 'currency' ? BRL : NUM;
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 space-y-3`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.label}</p>
          <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>{fmt(m.latest)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{m.latestLabel} · último período</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Icon className={`w-5 h-5 ${cfg.color}`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
        </div>
      </div>
      <Sparkline values={m.series.map(s => s.value)} color={cfg.spark} />
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Média</p>
          <p className="text-xs font-semibold text-slate-700">{fmt(m.mean)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">vs. Média</p>
          <p className={`text-xs font-semibold ${m.direction === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {PCT(m.changeVsMean)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Z-Score</p>
          <p className={`text-xs font-semibold ${cfg.color}`}>
            {m.zScore > 0 ? '+' : ''}{m.zScore}σ
          </p>
        </div>
      </div>
    </div>
  );
}

function AnomalySection({ anomalies }: { anomalies: IntelligenceData['anomalies'] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Radar de Anomalias</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detecta quando uma métrica sai do padrão histórico (Z-score ≥ 1.2σ = atenção · ≥ 2σ = anomalia)
          </p>
        </div>
        {anomalies.totalAlerts > 0
          ? <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">{anomalies.totalAlerts} alerta{anomalies.totalAlerts > 1 ? 's' : ''}</span>
          : anomalies.metrics.length > 0 && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Tudo normal</span>
        }
      </div>

      {anomalies.metrics.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Precisamos de ao menos 3 meses de dados para detectar anomalias.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {anomalies.metrics.map(m => <AnomalyCard key={m.label} m={m} />)}
        </div>
      )}

      {anomalies.alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {anomalies.alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${a.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              {a.severity === 'critical' ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{a.message}</span>
              <span className="ml-auto font-mono text-xs opacity-60 whitespace-nowrap">z={a.zScore > 0 ? '+' : ''}{a.zScore}σ</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PÁGINA PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function IntelligencePage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
      const res = await fetch(`/api/data/intelligence?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dateRange.start, dateRange.end]);

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Inteligência</h1>
            <p className="text-sm text-slate-500">Análise automatizada dos seus dados reais</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter
            activePeriod={activePeriod}
            dateRange={dateRange}
            onPresetSelect={setPresetPeriod}
            onRangeChange={setCustomDateRange}
          />
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-3 text-sm text-slate-500">Analisando dados...</span>
        </div>
      )}

      {/* Erro */}
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
            Importe dados do Pipedrive para ativar as análises de inteligência.
          </p>
        </div>
      )}

      {!loading && !error && data?.hasData && (
        <>
          <ChannelRankingSection    channels={data.channelRanking} />
          <TemporalSection          channels={data.temporalByChannel} allMonthKeys={data.allMonthKeys} />
        </>
      )}
    </div>
  );
}
