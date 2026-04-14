'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader, AlertCircle, Upload } from 'lucide-react';
import type { PipedriveDirectRecentDeal } from '@/lib/pipedrive-direct-store';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';
import { DateRangeFilter } from '@/components/date-range-filter';

interface LiviaStats {
  totalCreated: number;
  totalWon: number;
  totalOpen: number;
  totalLost: number;
  winRate: number;
  deals: PipedriveDirectRecentDeal[];
}

function getDateOnly(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function isInRange(value: string | null | undefined, start: string, end: string): boolean {
  const d = getDateOnly(value);
  if (!d) return false;
  return d >= start && d <= end;
}

function statusLabel(status: string) {
  if (status === 'won') return { label: 'Won', cls: 'bg-emerald-100 text-emerald-700' };
  if (status === 'lost') return { label: 'Lost', cls: 'bg-red-100 text-red-700' };
  return { label: 'Aberto', cls: 'bg-amber-100 text-amber-700' };
}

export default function LiviaAnalysisPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [allLiviaDeals, setAllLiviaDeals] = useState<PipedriveDirectRecentDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LiviaStats | null>(null);

  // Carrega todos os deals da Livia uma vez
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let response = await fetch('/api/pipedrive-direct');
        if (!response.ok) throw new Error('Falha ao carregar dados do Pipedrive');

        let data = await response.json();
        let directData = data.data;

        if (!directData?.allDeals?.length) {
          const syncRes = await fetch('/api/pipedrive-direct/sync', { method: 'POST' });
          if (syncRes.ok) {
            const retryRes = await fetch('/api/pipedrive-direct');
            if (retryRes.ok) {
              data = await retryRes.json();
              directData = data.data;
            }
          }
        }

        if (!directData?.allDeals?.length) {
          throw new Error('Nenhum dado sincronizado. Verifique a configuração do Pipedrive Direto.');
        }

        const livia = (directData.allDeals as PipedriveDirectRecentDeal[]).filter(deal => {
          const owner = (deal.ownerName || '').toLowerCase();
          const pipeline = (deal.pipelineName || '').toLowerCase();
          return owner.includes('livia') || pipeline.includes('livia');
        });

        if (livia.length === 0) {
          throw new Error('Nenhum deal encontrado para Livia no Pipedrive.');
        }

        setAllLiviaDeals(livia);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Recalcula métricas quando o período muda
  useEffect(() => {
    if (!allLiviaDeals.length) return;

    const filtered = allLiviaDeals.filter(d => isInRange(d.addTime, dateRange.start, dateRange.end));

    let won = 0, open = 0, lost = 0;
    filtered.forEach(deal => {
      const s = (deal.status || '').toLowerCase();
      if (s === 'won') won++;
      else if (s === 'lost') lost++;
      else open++;
    });

    const sorted = [...filtered].sort((a, b) => {
      const order = { won: 0, open: 1, lost: 2 } as Record<string, number>;
      const diff = (order[(a.status || '').toLowerCase()] ?? 1) - (order[(b.status || '').toLowerCase()] ?? 1);
      if (diff !== 0) return diff;
      return String(b.addTime || '').localeCompare(String(a.addTime || ''));
    });

    setStats({
      totalCreated: filtered.length,
      totalWon: won,
      totalOpen: open,
      totalLost: lost,
      winRate: filtered.length > 0 ? (won / filtered.length) * 100 : 0,
      deals: sorted,
    });
  }, [allLiviaDeals, dateRange.start, dateRange.end]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Análise Comercial</p>
          <h1 className="text-2xl font-bold text-slate-900">Análise Livia</h1>
          <p className="text-xs text-slate-400 mt-1">Deals do funil Pré Vendas - Livia por período de criação</p>
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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Deals no Período</p>
              <p className="text-3xl font-bold text-blue-600">{stats?.totalCreated ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-1">criados no período</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Em Aberto</p>
              <p className="text-3xl font-bold text-amber-600">{stats?.totalOpen ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-1">no pipeline</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ganhos (Won)</p>
              <p className="text-3xl font-bold text-emerald-600">{stats?.totalWon ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-1">retornaram de viagem</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Taxa Won</p>
              <p className="text-3xl font-bold text-slate-800">
                {stats?.winRate != null ? `${stats.winRate.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">{stats?.totalLost ?? 0} perdidos</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Deals de Livia</h2>
              <span className="text-xs text-slate-400">{stats?.totalCreated ?? 0} deals no período</span>
            </div>

            {stats?.deals && stats.deals.length > 0 ? (
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
                    {stats.deals.map(deal => {
                      const { label, cls } = statusLabel((deal.status || '').toLowerCase());
                      return (
                        <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">{deal.title || `Deal ${deal.id}`}</p>
                            <p className="text-xs text-slate-400">ID {deal.id}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{deal.canal || deal.howArrived || 'Não informado'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{deal.ownerName || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{deal.stageName || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {deal.addTime ? new Date(deal.addTime).toLocaleDateString('pt-BR') : '—'}
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
