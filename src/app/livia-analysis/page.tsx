'use client';

import { useEffect, useState } from 'react';
import { Loader, AlertCircle, ArrowRight, TrendingUp, Clock, DollarSign } from 'lucide-react';
import type { PipedriveDirectRecentDeal } from '@/lib/pipedrive-direct-store';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';
import { DateRangeFilter } from '@/components/date-range-filter';

interface CanalRow {
  canal: string;
  total: number;
  won: number;
  open: number;
  lost: number;
  winRate: number;
  avgValue: number | null;    // ticket médio dos won
  avgDaysToWin: number | null; // tempo médio até ganho
}

interface LiviaStats {
  total: number;
  won: number;
  open: number;
  lost: number;
  winRate: number;
  avgValue: number | null;
  avgDaysToWin: number | null;
  byCanal: CanalRow[];
  deals: PipedriveDirectRecentDeal[];
}

function getDateOnly(v: string | null | undefined) {
  return v ? String(v).slice(0, 10) : '';
}
function inRange(v: string | null | undefined, s: string, e: string) {
  const d = getDateOnly(v);
  return d ? d >= s && d <= e : false;
}
function pct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '—';
}
function fmtBRL(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a.slice(0, 10));
  const db = new Date(b.slice(0, 10));
  const diff = Math.round((db.getTime() - da.getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}

function FunnelStep({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className={`flex-1 min-w-[110px] ${color} rounded-2xl p-4 text-center`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_STYLE = {
  won:  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', label: 'Won' },
  open: { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',   bar: 'bg-amber-500',   label: 'Em Aberto' },
  lost: { bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700',       bar: 'bg-red-400',     label: 'Perdidos' },
};

function statusBadge(status: string) {
  if (status === 'won')  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Won</span>;
  if (status === 'lost') return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Lost</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Aberto</span>;
}

function InsightCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 opacity-70">{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function LiviaAnalysisPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [allDeals, setAllDeals] = useState<PipedriveDirectRecentDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LiviaStats | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let res = await fetch('/api/pipedrive-direct');
        if (!res.ok) throw new Error('Falha ao carregar dados do Pipedrive');
        let data = await res.json();
        let direct = data.data;

        if (!direct?.allDeals?.length) {
          const sync = await fetch('/api/pipedrive-direct/sync', { method: 'POST' });
          if (sync.ok) {
            const retry = await fetch('/api/pipedrive-direct');
            if (retry.ok) { data = await retry.json(); direct = data.data; }
          }
        }

        if (!direct?.allDeals?.length)
          throw new Error('Nenhum dado sincronizado. Verifique a configuração do Pipedrive Direto.');

        const livia = (direct.allDeals as PipedriveDirectRecentDeal[]).filter(d =>
          (d.ownerName || '').toLowerCase().includes('livia') ||
          (d.pipelineName || '').toLowerCase().includes('livia')
        );

        if (!livia.length) throw new Error('Nenhum deal encontrado para Livia no Pipedrive.');

        setAllDeals(livia);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!allDeals.length) return;

    const filtered = allDeals.filter(d => {
      const status = (d.status || '').toLowerCase();
      if (status === 'won') {
        const wt = getDateOnly(d.wonTime);
        return wt ? wt >= dateRange.start && wt <= dateRange.end : inRange(d.addTime, dateRange.start, dateRange.end);
      }
      if (status === 'open') return true;
      return inRange(d.addTime, dateRange.start, dateRange.end);
    });

    let won = 0, open = 0, lost = 0;
    const wonValues: number[] = [];
    const wonDays: number[] = [];
    const canalMap = new Map<string, { canal: string; total: number; won: number; open: number; lost: number; values: number[]; days: number[] }>();

    filtered.forEach(d => {
      const s = (d.status || '').toLowerCase();
      if (s === 'won') { won++; } else if (s === 'lost') { lost++; } else { open++; }

      if (s === 'won') {
        if (d.value != null) wonValues.push(d.value);
        const days = daysBetween(d.addTime, d.wonTime);
        if (days != null) wonDays.push(days);
      }

      const canal = d.canal || d.howArrived || 'Não informado';
      const row = canalMap.get(canal) ?? { canal, total: 0, won: 0, open: 0, lost: 0, values: [], days: [] };
      row.total++;
      if (s === 'won') {
        row.won++;
        if (d.value != null) row.values.push(d.value);
        const days = daysBetween(d.addTime, d.wonTime);
        if (days != null) row.days.push(days);
      } else if (s === 'lost') {
        row.lost++;
      } else {
        row.open++;
      }
      canalMap.set(canal, row);
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const byCanal: CanalRow[] = Array.from(canalMap.values())
      .map(r => ({
        canal: r.canal,
        total: r.total,
        won: r.won,
        open: r.open,
        lost: r.lost,
        winRate: r.total > 0 ? (r.won / r.total) * 100 : 0,
        avgValue: avg(r.values),
        avgDaysToWin: avg(r.days) != null ? Math.round(avg(r.days)!) : null,
      }))
      .sort((a, b) => b.total - a.total);

    const sorted = [...filtered].sort((a, b) => {
      const ord = { won: 0, open: 1, lost: 2 } as Record<string, number>;
      const diff = (ord[(a.status || '').toLowerCase()] ?? 1) - (ord[(b.status || '').toLowerCase()] ?? 1);
      return diff !== 0 ? diff : String(b.addTime || '').localeCompare(String(a.addTime || ''));
    });

    setStats({
      total: filtered.length,
      won, open, lost,
      winRate: filtered.length > 0 ? (won / filtered.length) * 100 : 0,
      avgValue: avg(wonValues),
      avgDaysToWin: avg(wonDays) != null ? Math.round(avg(wonDays)!) : null,
      byCanal,
      deals: sorted,
    });
  }, [allDeals, dateRange.start, dateRange.end]);

  // Insights por canal
  const bestConvCanal = stats?.byCanal.filter(r => r.won > 0).sort((a, b) => b.winRate - a.winRate)[0];
  const bestTicketCanal = stats?.byCanal.filter(r => r.avgValue != null).sort((a, b) => (b.avgValue ?? 0) - (a.avgValue ?? 0))[0];
  const fastestCanal = stats?.byCanal.filter(r => r.avgDaysToWin != null && r.won > 0).sort((a, b) => (a.avgDaysToWin ?? 999) - (b.avgDaysToWin ?? 999))[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Análise Comercial</p>
          <h1 className="text-2xl font-bold text-slate-900">Análise Livia</h1>
          <p className="text-xs text-slate-400 mt-1">Funil Pré Vendas — deals won por wonTime, abertos sempre visíveis, perdidos por criação</p>
        </div>
        <DateRangeFilter
          activePeriod={activePeriod}
          dateRange={dateRange}
          onPresetSelect={setPresetPeriod}
          onRangeChange={setCustomDateRange}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Carregando...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 text-sm">Erro ao carregar dados</p>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Funil Visual */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-5">Funil Geral</h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <FunnelStep label="Deals" value={stats?.total ?? 0} sub="no período" color="bg-blue-500 text-white" />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <FunnelStep label="Em Aberto" value={stats?.open ?? 0} sub={pct(stats?.open ?? 0, stats?.total ?? 0)} color="bg-amber-500 text-white" />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <FunnelStep label="Won" value={stats?.won ?? 0} sub={pct(stats?.won ?? 0, stats?.total ?? 0)} color="bg-emerald-500 text-white" />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <FunnelStep label="Perdidos" value={stats?.lost ?? 0} sub={pct(stats?.lost ?? 0, stats?.total ?? 0)} color="bg-red-400 text-white" />
            </div>
          </div>

          {/* Cards por status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['won', 'open', 'lost'] as const).map(key => {
              const s = STATUS_STYLE[key];
              const count = stats?.[key] ?? 0;
              const total = stats?.total ?? 0;
              const p = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={key} className={`rounded-xl border p-5 ${s.bg} ${s.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${s.badge}`}>{s.label}</span>
                    <span className="text-xs text-slate-500 font-medium">{p.toFixed(1)}% do total</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{count}</p>
                  <p className="text-xs text-slate-500 mb-3">de {total} deals no período</p>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${Math.min(p, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insights por canal */}
          {(bestConvCanal || bestTicketCanal || fastestCanal) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bestConvCanal && (
                <InsightCard
                  icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                  label="Maior taxa de conversão"
                  value={`${bestConvCanal.winRate.toFixed(1)}% won`}
                  sub={bestConvCanal.canal}
                  color="bg-emerald-50 border border-emerald-200"
                />
              )}
              {bestTicketCanal && (
                <InsightCard
                  icon={<DollarSign className="w-4 h-4 text-blue-600" />}
                  label="Maior ticket médio (won)"
                  value={fmtBRL(bestTicketCanal.avgValue)}
                  sub={bestTicketCanal.canal}
                  color="bg-blue-50 border border-blue-200"
                />
              )}
              {fastestCanal && (
                <InsightCard
                  icon={<Clock className="w-4 h-4 text-purple-600" />}
                  label="Fechamento mais rápido"
                  value={`${fastestCanal.avgDaysToWin} dias`}
                  sub={fastestCanal.canal}
                  color="bg-purple-50 border border-purple-200"
                />
              )}
            </div>
          )}

          {/* Breakdown por Canal */}
          {(stats?.byCanal?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Por Canal de Origem</h2>
                <p className="text-xs text-slate-400 mt-0.5">Ticket médio e tempo calculados apenas sobre deals Won</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Canal</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Won</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Perdidos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Won</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ticket Médio</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tempo Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats!.byCanal.map(row => (
                      <tr key={row.canal} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.canal}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{row.total}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold text-emerald-600">{row.won}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold text-red-500">{row.lost}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold ${row.winRate >= 20 ? 'text-emerald-600' : row.winRate >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                            {row.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-medium text-slate-700">{fmtBRL(row.avgValue)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-medium text-slate-700">
                            {row.avgDaysToWin != null ? `${row.avgDaysToWin}d` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela de Deals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Deals de Livia</h2>
              <span className="text-xs text-slate-400">{stats?.total ?? 0} deals no período</span>
            </div>

            {(stats?.deals?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Deal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Canal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Criado em</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Dias p/ won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats!.deals.map(deal => {
                      const daysToWin = (deal.status || '').toLowerCase() === 'won'
                        ? daysBetween(deal.addTime, deal.wonTime)
                        : null;
                      return (
                        <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">{deal.title || `Deal ${deal.id}`}</p>
                            <p className="text-xs text-slate-400">ID {deal.id}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{deal.canal || deal.howArrived || 'Não informado'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{deal.stageName || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium">
                            {deal.value != null ? fmtBRL(deal.value) : '—'}
                          </td>
                          <td className="px-4 py-3">{statusBadge((deal.status || '').toLowerCase())}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {deal.addTime ? new Date(deal.addTime).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {daysToWin != null ? (
                              <span className={`font-medium ${daysToWin <= 7 ? 'text-emerald-600' : daysToWin <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                                {daysToWin}d
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-slate-400 text-sm">Nenhum deal no período selecionado</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
