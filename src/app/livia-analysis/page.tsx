'use client';

import { useEffect, useState } from 'react';
import { Loader, AlertCircle, ArrowRight } from 'lucide-react';
import type { PipedriveDirectRecentDeal } from '@/lib/pipedrive-direct-store';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';
import { DateRangeFilter } from '@/components/date-range-filter';

interface LiviaStats {
  total: number;
  won: number;
  open: number;
  lost: number;
  winRate: number;
  byCanal: CanalRow[];
  deals: PipedriveDirectRecentDeal[];
}

interface CanalRow {
  canal: string;
  total: number;
  won: number;
  open: number;
  lost: number;
  winRate: number;
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

function FunnelStep({ label, value, sub, color, source }: {
  label: string; value: string | number; sub?: string; color: string; source?: string;
}) {
  return (
    <div className={`flex-1 min-w-[110px] ${color} rounded-2xl p-4 text-center relative`}>
      {source && (
        <span className="absolute top-2 right-2 text-[10px] font-bold opacity-60 uppercase tracking-wider">{source}</span>
      )}
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

export default function LiviaAnalysisPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [allDeals, setAllDeals] = useState<PipedriveDirectRecentDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LiviaStats | null>(null);

  // Carrega todos os deals da Livia (uma vez)
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

  // Recalcula quando período muda
  useEffect(() => {
    if (!allDeals.length) return;

    const filtered = allDeals.filter(d => {
      const status = (d.status || '').toLowerCase();
      // Won: filtra por wonTime (quando o deal foi ganho, não quando foi criado)
      if (status === 'won') {
        const wt = getDateOnly(d.wonTime);
        return wt ? wt >= dateRange.start && wt <= dateRange.end : inRange(d.addTime, dateRange.start, dateRange.end);
      }
      // Open: mostra todos os deals abertos (estão ativos agora no pipeline)
      if (status === 'open') return true;
      // Lost: filtra por data de criação (não temos lostTime)
      return inRange(d.addTime, dateRange.start, dateRange.end);
    });

    let won = 0, open = 0, lost = 0;
    const canalMap = new Map<string, CanalRow>();

    filtered.forEach(d => {
      const s = (d.status || '').toLowerCase();
      if (s === 'won') won++; else if (s === 'lost') lost++; else open++;

      const canal = d.canal || d.howArrived || 'Não informado';
      const row = canalMap.get(canal) ?? { canal, total: 0, won: 0, open: 0, lost: 0, winRate: 0 };
      row.total++;
      if (s === 'won') row.won++; else if (s === 'lost') row.lost++; else row.open++;
      canalMap.set(canal, row);
    });

    const byCanal = Array.from(canalMap.values())
      .map(r => ({ ...r, winRate: r.total > 0 ? (r.won / r.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);

    const sorted = [...filtered].sort((a, b) => {
      const ord = { won: 0, open: 1, lost: 2 } as Record<string, number>;
      const diff = (ord[(a.status || '').toLowerCase()] ?? 1) - (ord[(b.status || '').toLowerCase()] ?? 1);
      return diff !== 0 ? diff : String(b.addTime || '').localeCompare(String(a.addTime || ''));
    });

    setStats({ total: filtered.length, won, open, lost, winRate: filtered.length > 0 ? (won / filtered.length) * 100 : 0, byCanal, deals: sorted });
  }, [allDeals, dateRange.start, dateRange.end]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Análise Comercial</p>
          <h1 className="text-2xl font-bold text-slate-900">Análise Livia</h1>
          <p className="text-xs text-slate-400 mt-1">Deals do funil Pré Vendas - Livia por data de criação</p>
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
              <FunnelStep label="Deals Criados" value={stats?.total ?? 0} sub="no período" color="bg-blue-500 text-white" source="PIPE" />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <FunnelStep label="Em Aberto"    value={stats?.open ?? 0}  sub={pct(stats?.open ?? 0, stats?.total ?? 0)} color="bg-amber-500 text-white" />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <FunnelStep label="Won (Viagem)" value={stats?.won ?? 0}   sub={pct(stats?.won ?? 0, stats?.total ?? 0)}  color="bg-emerald-500 text-white" />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <FunnelStep label="Perdidos"     value={stats?.lost ?? 0}  sub={pct(stats?.lost ?? 0, stats?.total ?? 0)} color="bg-red-400 text-white" />
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

          {/* Breakdown por Canal */}
          {(stats?.byCanal?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Por Canal de Origem</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Canal</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Em Aberto</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Won</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Perdidos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats!.byCanal.map(row => (
                      <tr key={row.canal} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.canal}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{row.total}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold text-amber-600">{row.open}</span>
                        </td>
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
                <table className="w-full min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Deal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Canal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Criado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats!.deals.map(deal => (
                      <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{deal.title || `Deal ${deal.id}`}</p>
                          <p className="text-xs text-slate-400">ID {deal.id}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{deal.canal || deal.howArrived || 'Não informado'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{deal.ownerName || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{deal.stageName || '—'}</td>
                        <td className="px-4 py-3">{statusBadge((deal.status || '').toLowerCase())}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {deal.addTime ? new Date(deal.addTime).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
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
