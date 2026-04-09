'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3, Clock, Database, DollarSign, Loader, ShoppingCart,
  Target, TrendingUp, Upload, Users, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';
import { DateRangeFilter } from '@/components/date-range-filter';

function fmt(n: number, type: 'currency' | 'number' | 'pct' | 'multiplier' = 'number'): string {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(n);
  }
  if (type === 'pct') return `${n.toFixed(1)}%`;
  if (type === 'multiplier') return `${n.toFixed(1)}x`;
  return new Intl.NumberFormat('pt-BR').format(n);
}

function getGoogleChannelLabel(channelType?: string, channelSubType?: string | null): string {
  const type = (channelType || 'UNKNOWN').toUpperCase();
  if (type === 'SEARCH') return 'Pesquisa';
  if (type === 'DISPLAY') return 'Display';
  if (type === 'PERFORMANCE_MAX') return 'PMAX';
  if (type === 'VIDEO') return 'Video';
  if (type === 'DEMAND_GEN') return 'Demand Gen';
  if (type === 'SHOPPING') return 'Shopping';
  if (type === 'MULTI_CHANNEL') return channelSubType ? `Multicanal / ${channelSubType}` : 'Multicanal';
  if (type === 'UNKNOWN') return 'Nao classificado';
  return channelSubType ? `${type} / ${channelSubType}` : type;
}

interface OverviewData {
  period: string;
  periodLabel: string;
  referencePeriod: string | null;
  meta: {
    connected: boolean;
    accountName: string | null;
    investimento: number;
    impressions: number;
    clicks: number;
    results: number;
  };
  googleAds: {
    connected: boolean;
    accountName: string | null;
    investimento: number;
    impressions: number;
    clicks: number;
    months: Array<{ month: string; year: number; spend: number; clicks: number; impressions: number }>;
    channelBreakdown: Array<{
      channelType: string;
      channelSubType: string | null;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      campaigns: number;
    }>;
  };
  pipedrive: {
    connected: boolean;
    updatedAt: string | null;
    totalDeals: number;
    withMondeBilling: number;
    mondeRevenue: number;
    totalRevenue: number;
    receitaMidiaPaga: number;
    receitaOrganica: number;
    receitaBranding: number;
    receitaDesconhecida: number;
    vendasMidiaPaga: number;
    totalLeads: number;
    totalLost: number;
    channels: Array<{ canal: string; attribution: string; vendas: number; receita: number; ticket: number }>;
    byAttribution: Array<{
      attribution: string;
      label: string;
      description: string;
      receita: number;
      vendas: number;
      receitaPct: number;
      usedForRoi: boolean;
    }>;
    organicSubChannels: Array<{
      key: string;
      label: string;
      receita: number;
      vendas: number;
      receitaPct: number;
    }>;
  };
  sdr: {
    enabled: boolean;
    hasData: boolean;
    updatedAt: string | null;
    totalLeads: number;
    totalQualified: number;
    totalSales: number;
    channels: Array<{ canal: string; vendas: number }>;
    months: Array<{ month: string; year?: number; leads: number; qualified: number; sales: number }>;
  };
  kpis: {
    investimento: number;
    investimentoMeta: number;
    investimentoGoogle: number;
    receita: number;
    receitaMidiaPaga: number;
    vendas: number;
    vendasMidiaPaga: number;
    roi: number | null;
    cpl: number | null;
    conversionRate: number | null;
    avgDaysToWin: number | null;
  };
}

function KpiBox({
  label, value, sub, icon, accent, highlight,
}: {
  label: string; value: string; sub?: string | React.ReactNode;
  icon: React.ReactNode; accent: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${highlight ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 ${accent} rounded-lg flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
      connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {label}
    </span>
  );
}

export default function OverviewPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      period: activePeriod,
      start: dateRange.start,
      end: dateRange.end,
    });
    const controller = new AbortController();
    fetch(`/api/data/overview?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(r => r.json())
      .then((overviewPayload) => {
        if (!controller.signal.aborted && !overviewPayload?.error) {
          setData(overviewPayload);
        }
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [activePeriod, dateRange.end, dateRange.start]);

  const hasAnyData = !!(
    data?.meta.connected ||
    data?.googleAds.connected ||
    data?.pipedrive.connected ||
    (data?.sdr.enabled && data?.sdr.hasData)
  );

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Marketing e Receita</p>
          <h1 className="text-2xl font-bold text-slate-900">Visao Executiva</h1>
          {data?.referencePeriod && (
            <p className="text-sm text-slate-500 mt-0.5">
              Periodo de referencia: <span className="font-semibold text-slate-700">{data.referencePeriod}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {data && (
            <div className="flex items-center gap-1.5 flex-wrap mr-2">
              <StatusBadge
                connected={data.meta.connected}
                label={data.meta.connected ? (data.meta.accountName || 'Meta Ads') : 'Meta desconectado'}
              />
              <StatusBadge
                connected={data.googleAds.connected}
                label={data.googleAds.connected ? 'Google Ads' : 'Google Ads nao importado'}
              />
              <StatusBadge
                connected={data.pipedrive.connected}
                label={data.pipedrive.connected ? 'Pipe Monde' : 'Pipe Monde nao importado'}
              />
              {data.sdr.enabled && (
                <StatusBadge
                  connected={data.sdr.hasData}
                  label={data.sdr.hasData ? 'SDR' : 'SDR nao importado'}
                />
              )}
            </div>
          )}
          <DateRangeFilter
            activePeriod={activePeriod}
            dateRange={dateRange}
            onPresetSelect={setPresetPeriod}
            onRangeChange={setCustomDateRange}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Carregando...</span>
        </div>
      ) : !hasAnyData ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-2">Nenhum dado disponivel</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Importe as fontes de dados para ver a visao executiva completa.
          </p>
          <Link href="/settings" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <Zap className="w-4 h-4" />
            Abrir configuracoes
          </Link>
        </div>
      ) : (
        <>
          {/* ── 3 Cards Estratégicos ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Card 1 — Retorno de Mídia */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retorno de Mídia</h2>
                <div className="flex items-center gap-1.5">
                  {data?.meta.connected && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" title="Meta conectado" />}
                  {data?.googleAds.connected && <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" title="Google conectado" />}
                </div>
              </div>

              {/* ROAS destaque */}
              <div className="mt-3 mb-5">
                <p className="text-xs text-slate-400 mb-0.5">ROAS (receita mídia paga / invest.)</p>
                <p className={`text-4xl font-bold ${data?.kpis.roi && data.kpis.roi >= 3 ? 'text-emerald-600' : data?.kpis.roi ? 'text-amber-500' : 'text-slate-300'}`}>
                  {data?.kpis.roi != null ? fmt(data.kpis.roi, 'multiplier') : '—'}
                </p>
                {data?.kpis.roi != null && (
                  <p className="text-xs text-slate-400 mt-1">
                    {data.kpis.roi >= 5 ? '✅ Excelente retorno' : data.kpis.roi >= 3 ? '✅ Retorno saudável' : '⚠️ Retorno abaixo do ideal'}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                {/* Total investido */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Invest. total (Meta + Google)</span>
                  <span className="text-sm font-bold text-slate-800">
                    {data?.kpis.investimento > 0 ? fmt(data.kpis.investimento, 'currency') : '—'}
                  </span>
                </div>
                {/* Meta vs Google */}
                {(data?.kpis.investimentoMeta > 0 || data?.kpis.investimentoGoogle > 0) && (
                  <div className="flex items-center gap-2">
                    {data?.kpis.investimentoMeta > 0 && (
                      <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-semibold text-blue-400 uppercase">Meta</p>
                        <p className="text-sm font-bold text-blue-700">{fmt(data.kpis.investimentoMeta, 'currency')}</p>
                        {data.meta.clicks > 0 && <p className="text-[10px] text-blue-400">{fmt(data.meta.clicks)} cliques</p>}
                      </div>
                    )}
                    {data?.kpis.investimentoGoogle > 0 && (
                      <div className="flex-1 bg-orange-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-semibold text-orange-400 uppercase">Google</p>
                        <p className="text-sm font-bold text-orange-700">{fmt(data.kpis.investimentoGoogle, 'currency')}</p>
                        {data.googleAds.clicks > 0 && <p className="text-[10px] text-orange-400">{fmt(data.googleAds.clicks)} cliques</p>}
                      </div>
                    )}
                  </div>
                )}
                {/* Receita atribuída */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Receita atribuída a mídia paga</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {data?.kpis.receitaMidiaPaga > 0 ? fmt(data.kpis.receitaMidiaPaga, 'currency') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2 — Funil Comercial */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Funil Comercial</h2>
                {data?.pipedrive.connected && <span className="text-xs text-emerald-600 font-medium">Carregado</span>}
              </div>

              {/* Receita destaque */}
              <div className="mt-3 mb-5">
                <p className="text-xs text-slate-400 mb-0.5">Receita total (Monde)</p>
                <p className="text-4xl font-bold text-emerald-600">
                  {data?.kpis.receita > 0 ? fmt(data.kpis.receita, 'currency') : '—'}
                </p>
                {data?.kpis.vendas > 0 && data?.kpis.receita > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Ticket médio: <span className="font-semibold text-slate-600">{fmt(Math.round(data.kpis.receita / data.kpis.vendas), 'currency')}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                {/* Funil visual */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{data?.pipedrive.totalLeads > 0 ? fmt(data.pipedrive.totalLeads) : '—'}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Oport.</p>
                  </div>
                  <span className="text-slate-300 text-lg">→</span>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">{data?.kpis.vendas > 0 ? fmt(data.kpis.vendas) : '—'}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Vendas</p>
                  </div>
                  {data?.kpis.conversionRate != null && (
                    <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full ${data.kpis.conversionRate >= 20 ? 'bg-emerald-100 text-emerald-700' : data.kpis.conversionRate >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {fmt(data.kpis.conversionRate, 'pct')}
                    </span>
                  )}
                </div>
                {/* Perdidos */}
                {data?.pipedrive.totalLost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Perdidos no período</span>
                    <span className="text-sm font-semibold text-red-500">{fmt(data.pipedrive.totalLost)}</span>
                  </div>
                )}
                {/* Ciclo médio — exibido no card dedicado abaixo */}
                {data?.kpis.avgDaysToWin == null && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Ciclo médio de venda</span>
                    <span className="text-sm font-bold text-slate-300">—</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3 — Origem da Receita */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Origem da Receita</h2>
                <span className="text-xs text-slate-400">Monde</span>
              </div>

              {/* Cabeçalho: vendas totais como hero (não duplica receita do Card 2) */}
              <div className="mt-3 mb-4">
                <p className="text-xs text-slate-400 mb-0.5">Total de vendas no período</p>
                <p className="text-4xl font-bold text-slate-800">
                  {data?.kpis.vendas > 0 ? fmt(data.kpis.vendas) : '—'}
                  <span className="text-sm font-medium text-slate-400 ml-2">vendas</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {data?.kpis.receita > 0 ? fmt(data.kpis.receita, 'currency') : '—'} distribuídos por origem
                </p>
              </div>

              {/* Ranked list — barra horizontal proporcional */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                {(() => {
                  const mondeRevTotal = data?.pipedrive.mondeRevenue || 0;
                  const maxPctAll = mondeRevTotal > 0 ? 100 : 1;

                  // Linha individual reutilizável
                  const Row = ({
                    dot, text, label, receita, receitaPct, vendas, bar, indent = false,
                  }: {
                    dot: string; text: string; label: string;
                    receita: number; receitaPct: number; vendas: number;
                    bar: string; indent?: boolean;
                  }) => {
                    const barWidth = maxPctAll > 0 ? (receitaPct / maxPctAll) * 100 : 0;
                    return (
                      <div className={`space-y-1.5 ${indent ? 'pl-4' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`flex-shrink-0 rounded-full ${indent ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${dot}`} />
                            <span className={`truncate font-semibold ${indent ? 'text-[11px]' : 'text-xs'} ${text}`}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={`font-bold text-slate-800 ${indent ? 'text-xs' : 'text-sm'}`}>{fmt(receita, 'currency')}</span>
                            <span className="text-xs font-medium text-slate-400 w-9 text-right">{fmt(receitaPct, 'pct')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 bg-slate-100 rounded-full overflow-hidden ${indent ? 'h-1.5' : 'h-2.5'}`}>
                            <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 w-14 text-right flex-shrink-0">
                            {fmt(vendas)} venda{vendas !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  };

                  const byAttr = data?.pipedrive.byAttribution || [];
                  const organicSubs = data?.pipedrive.organicSubChannels || [];

                  // Cores por sub-canal orgânico
                  const ORGANIC_SUB_STYLE: Record<string, { dot: string; text: string; bar: string }> = {
                    indicacao:  { dot: 'bg-amber-400',  text: 'text-amber-700',  bar: 'bg-amber-400' },
                    networking: { dot: 'bg-orange-400', text: 'text-orange-700', bar: 'bg-orange-400' },
                    prospeccao: { dot: 'bg-yellow-500', text: 'text-yellow-700', bar: 'bg-yellow-500' },
                  };

                  const rows: React.ReactNode[] = [];

                  for (const group of byAttr) {
                    if (group.receita <= 0) continue;

                    if (group.attribution === 'PAID_MEDIA') {
                      rows.push(
                        <Row key="paid" dot="bg-blue-500" text="text-blue-700" label="Mídia Paga"
                          receita={group.receita} receitaPct={group.receitaPct} vendas={group.vendas}
                          bar="bg-blue-500" />
                      );
                    } else if (group.attribution === 'ORGANIC_COMMERCIAL') {
                      // Título do grupo orgânico
                      rows.push(
                        <Row key="organic" dot="bg-amber-400" text="text-amber-700" label="Orgânico Comercial"
                          receita={group.receita} receitaPct={group.receitaPct} vendas={group.vendas}
                          bar="bg-amber-400" />
                      );
                      // Sub-canais recuados
                      if (organicSubs.length > 0) {
                        rows.push(
                          <div key="organic-subs" className="space-y-2 mt-1">
                            {organicSubs.map(sub => {
                              const style = ORGANIC_SUB_STYLE[sub.key] || { dot: 'bg-slate-400', text: 'text-slate-500', bar: 'bg-slate-400' };
                              return (
                                <Row key={sub.key} dot={style.dot} text={style.text} label={sub.label}
                                  receita={sub.receita} receitaPct={sub.receitaPct} vendas={sub.vendas}
                                  bar={style.bar} indent />
                              );
                            })}
                          </div>
                        );
                      }
                    } else if (group.attribution === 'BRAND_BASE') {
                      rows.push(
                        <Row key="brand" dot="bg-violet-500" text="text-violet-700" label="Base / Branding"
                          receita={group.receita} receitaPct={group.receitaPct} vendas={group.vendas}
                          bar="bg-violet-500" />
                      );
                    } else if (group.attribution === 'UNKNOWN') {
                      rows.push(
                        <Row key="unknown" dot="bg-slate-400" text="text-slate-500" label="Não informado"
                          receita={group.receita} receitaPct={group.receitaPct} vendas={group.vendas}
                          bar="bg-slate-300" />
                      );
                    }
                  }

                  return rows;
                })()}
              </div>
            </div>
          </div>

          {/* ── Card Tempo Médio de Ganho ── */}
          {data && data.kpis.avgDaysToWin != null && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tempo Médio de Ganho</h2>
                    <p className="text-[10px] text-slate-400">Criação no Pipe → Venda no Monde</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  data.kpis.avgDaysToWin <= 30
                    ? 'bg-emerald-100 text-emerald-700'
                    : data.kpis.avgDaysToWin <= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {data.kpis.avgDaysToWin <= 30 ? '✓ Ciclo curto' : data.kpis.avgDaysToWin <= 60 ? '⚠ Ciclo médio' : '↑ Ciclo longo'}
                </span>
              </div>

              <div className="flex items-end gap-6">
                {/* Número principal */}
                <div>
                  <p className="text-5xl font-bold text-violet-600">{data.kpis.avgDaysToWin}</p>
                  <p className="text-sm text-slate-500 mt-1">dias em média</p>
                </div>

                {/* Barra de contexto */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>0d</span><span>30d</span><span>60d</span><span>90d+</span>
                  </div>
                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="h-full bg-emerald-200 flex-1" style={{ maxWidth: '33.3%' }} />
                      <div className="h-full bg-amber-200 flex-1" style={{ maxWidth: '33.3%' }} />
                      <div className="h-full bg-red-200 flex-1" />
                    </div>
                    <div
                      className="absolute top-0 h-full w-1.5 bg-violet-600 rounded-full shadow"
                      style={{ left: `${Math.min((data.kpis.avgDaysToWin / 90) * 100, 97)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-emerald-600 font-medium">Rápido</span>
                    <span className="text-amber-600 font-medium">Médio</span>
                    <span className="text-red-500 font-medium">Longo</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">
                Calculado com base nos deals com correspondência entre Pipedrive (data de criação) e Monde (data da venda) no período selecionado.
              </p>
            </div>
          )}

          {/* ── Canais de receita (Pipe Monde) ── */}
          {data && data.pipedrive.channels.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
                Receita por Canal — Pipe Monde
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.pipedrive.channels.map((channel, index) => {
                  const maxRevenue = data.pipedrive.channels[0].receita || 0;
                  const pct = maxRevenue > 0 ? (channel.receita / maxRevenue) * 100 : 0;
                  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                  return (
                    <div key={channel.canal} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{channel.canal}</span>
                        <span className="text-sm font-bold text-emerald-700">{fmt(channel.receita, 'currency')}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5">
                        <div className={`${colors[index % colors.length]} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{fmt(channel.vendas)} vendas</span>
                        <span className="text-[11px] text-slate-400">TM: {fmt(channel.ticket, 'currency')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Atalhos de navegação ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/paid-media" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Midia Paga</p>
                  <p className="text-xs text-slate-400">Meta e Google Ads</p>
                </div>
              </div>
            </Link>
            <Link href="/channels" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Canais e Receita</p>
                  <p className="text-xs text-slate-400">Comparacao por canal (Monde)</p>
                </div>
              </div>
            </Link>
            <Link href="/funnel" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-violet-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                  <Target className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Funil Comercial</p>
                  <p className="text-xs text-slate-400">Leads SDR, qualificados, vendas</p>
                </div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
