'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3, Database, DollarSign, Loader, ShoppingCart,
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
        if (!controller.signal.aborted) {
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
          {/* ── KPIs principais ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

            {/* Invest. Meta separado */}
            <KpiBox
              label="Invest. Meta Ads"
              value={data && data.kpis.investimentoMeta > 0 ? fmt(data.kpis.investimentoMeta, 'currency') : '—'}
              sub={data?.meta.connected ? `${fmt(data.meta.impressions)} impressoes` : 'sem conexao'}
              icon={<Zap className="w-4 h-4 text-white" />}
              accent="bg-blue-500"
            />

            {/* Invest. Google separado */}
            <KpiBox
              label="Invest. Google Ads"
              value={data && data.kpis.investimentoGoogle > 0 ? fmt(data.kpis.investimentoGoogle, 'currency') : '—'}
              sub={data?.googleAds.connected ? `${fmt(data.googleAds.clicks)} cliques` : 'nao importado'}
              icon={<BarChart3 className="w-4 h-4 text-white" />}
              accent="bg-orange-500"
            />

            {/* Receita — SOMENTE Monde */}
            <KpiBox
              label="Receita (Monde)"
              value={data && data.kpis.receita > 0 ? fmt(data.kpis.receita, 'currency') : '—'}
              sub={
                data?.pipedrive.connected
                  ? <span>Fonte oficial: <span className="text-emerald-600 font-semibold">Pipe Monde</span></span>
                  : 'aguardando importacao do Monde'
              }
              icon={<TrendingUp className="w-4 h-4 text-white" />}
              accent="bg-emerald-500"
              highlight={!!(data?.kpis.receita && data.kpis.receita > 0)}
            />

            {/* Vendas (Pipedrive) */}
            <KpiBox
              label="Vendas"
              value={data && data.kpis.vendas > 0 ? fmt(data.kpis.vendas) : '—'}
              sub={
                data?.pipedrive.connected && data.kpis.vendas > 0
                  ? `Ticket medio: ${fmt(Math.round(data.kpis.receita / data.kpis.vendas), 'currency')}`
                  : 'deals com faturamento Monde'
              }
              icon={<ShoppingCart className="w-4 h-4 text-white" />}
              accent="bg-violet-500"
            />
          </div>

          {/* ── KPIs de desempenho ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiBox
              label="Invest. Total (Meta + Google)"
              value={data && data.kpis.investimento > 0 ? fmt(data.kpis.investimento, 'currency') : '—'}
              sub="soma dos dois canais pagos"
              icon={<DollarSign className="w-4 h-4 text-white" />}
              accent="bg-slate-600"
            />
            <KpiBox
              label="ROAS Mídia Paga"
              value={data?.kpis.roi !== null ? fmt(data!.kpis.roi!, 'multiplier') : '—'}
              sub={
                data?.kpis.roi !== null
                  ? <span>receita mídia paga / investimento <span className="text-blue-500 font-semibold">✓</span></span>
                  : 'dados insuficientes'
              }
              icon={<Target className="w-4 h-4 text-white" />}
              accent={data?.kpis.roi !== null && data!.kpis.roi! >= 3 ? 'bg-emerald-600' : 'bg-amber-500'}
              highlight={!!(data?.kpis.roi !== null && data!.kpis.roi! >= 3)}
            />
            <KpiBox
              label="Custo por Oportunidade"
              value={data?.kpis.cpl !== null ? fmt(data!.kpis.cpl!, 'currency') : '—'}
              sub={
                data?.kpis.conversionRate !== null
                  ? `${data!.kpis.conversionRate}% das oportunidades do Pipe fecharam`
                  : 'investimento total / oportunidades do Pipedrive'
              }
              icon={<Users className="w-4 h-4 text-white" />}
              accent="bg-cyan-500"
            />
          </div>

          {/* ── Cards de detalhe por fonte ── */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

            {/* Meta Ads */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Meta Ads</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Midia paga</p>
                </div>
                {data?.meta.connected ? (
                  <span className="text-xs text-emerald-600 font-medium">Conectado</span>
                ) : (
                  <Link href="/settings" className="text-xs text-blue-600 font-medium hover:underline">Conectar →</Link>
                )}
              </div>
              {data?.meta.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Investimento</span>
                    <span className="text-sm font-semibold text-blue-700">{fmt(data.meta.investimento, 'currency')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Impressoes</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.meta.impressions)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Cliques</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.meta.clicks)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Resultados</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.meta.results)}</span>
                  </div>
                  {data.meta.clicks > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">CPC medio</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {fmt(data.meta.investimento / data.meta.clicks, 'currency')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 mb-3">Meta nao configurado</p>
                  <Link href="/settings" className="text-xs text-blue-600 hover:underline">Configurar token →</Link>
                </div>
              )}
            </div>

            {/* Google Ads */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Google Ads</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Midia paga</p>
                </div>
                {data?.googleAds.connected ? (
                  <span className="text-xs text-emerald-600 font-medium">Carregado</span>
                ) : (
                  <Link href="/settings" className="text-xs text-blue-600 font-medium hover:underline">Importar →</Link>
                )}
              </div>
              {data?.googleAds.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Investimento</span>
                    <span className="text-sm font-semibold text-orange-600">{fmt(data.googleAds.investimento, 'currency')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Impressoes</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.googleAds.impressions)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Cliques</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.googleAds.clicks)}</span>
                  </div>
                  {data.googleAds.months.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                      <span>Periodo</span>
                      <span className="font-medium text-slate-600">
                        {data.googleAds.months.map(m => m.month).join(', ')}
                      </span>
                    </div>
                  )}
                  {data.googleAds.clicks > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">CPC medio</span>
                      <span className="text-sm font-semibold text-orange-500">
                        {fmt(data.googleAds.investimento / data.googleAds.clicks, 'currency')}
                      </span>
                    </div>
                  )}
                  {data.googleAds.channelBreakdown.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-2">Tipos visiveis</p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.googleAds.channelBreakdown.slice(0, 4).map((item) => (
                          <span
                            key={`${item.channelType}-${item.channelSubType || 'none'}`}
                            className="inline-flex items-center rounded-full bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700"
                          >
                            {getGoogleChannelLabel(item.channelType, item.channelSubType)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 mb-3">Google Ads nao importado</p>
                  <Link href="/settings" className="text-xs text-blue-600 hover:underline">Importar CSV →</Link>
                </div>
              )}
            </div>

            {/* Pipe Monde — fonte oficial de receita */}
            <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pipe Monde</h2>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">Fonte oficial de receita</p>
                </div>
                {data?.pipedrive.connected ? (
                  <span className="text-xs text-emerald-600 font-medium">Carregado</span>
                ) : (
                  <Link href="/settings" className="text-xs text-blue-600 font-medium hover:underline">Importar →</Link>
                )}
              </div>
              {data?.pipedrive.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Receita Monde</span>
                    <span className="text-sm font-bold text-emerald-700">{fmt(data.pipedrive.mondeRevenue, 'currency')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Deals fechados</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.pipedrive.totalDeals)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Com fat. Monde</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.pipedrive.withMondeBilling)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Canais</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.pipedrive.channels.length)}</span>
                  </div>
                  {data.pipedrive.totalDeals > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">Ticket medio</span>
                      <span className="text-sm font-semibold text-violet-700">
                        {fmt(Math.round(data.pipedrive.mondeRevenue / data.pipedrive.totalDeals), 'currency')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 mb-1">Pipe Monde nao importado</p>
                  <p className="text-xs text-slate-400 mb-3">Esta e a unica fonte de receita real</p>
                  <Link href="/settings" className="text-xs text-blue-600 hover:underline">Importar planilha →</Link>
                </div>
              )}
            </div>

            {/* SDR — atendimento e conversão */}
            {data?.sdr.enabled && <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">SDR</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Atendimento e conversao</p>
                </div>
                {data?.sdr.hasData ? (
                  <span className="text-xs text-emerald-600 font-medium">Carregado</span>
                ) : (
                  <Link href="/settings" className="text-xs text-blue-600 font-medium hover:underline">Importar →</Link>
                )}
              </div>
              {data?.sdr.hasData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Leads atendidos</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.sdr.totalLeads)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Qualificados</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.sdr.totalQualified)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Vendas fechadas</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(data.sdr.totalSales)}</span>
                  </div>
                  {data.kpis.conversionRate !== null && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">Taxa de conversao</span>
                      <span className={`text-sm font-bold ${data.kpis.conversionRate >= 10 ? 'text-emerald-600' : data.kpis.conversionRate >= 5 ? 'text-amber-600' : 'text-red-500'}`}>
                        {fmt(data.kpis.conversionRate, 'pct')}
                      </span>
                    </div>
                  )}
                  {data.sdr.channels.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-2">Canais de origem</p>
                      {data.sdr.channels.slice(0, 3).map(c => (
                        <div key={c.canal} className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-600 truncate max-w-[120px]">{c.canal}</span>
                          <span className="text-xs font-medium text-slate-700">{fmt(c.vendas)} vendas</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 mb-3">SDR nao importado</p>
                  <Link href="/settings" className="text-xs text-blue-600 hover:underline">Importar planilha →</Link>
                </div>
              )}
            </div>}
          </div>

          {/* ── Receita por Origem (Attribution Breakdown) ── */}
          {data && data.pipedrive.byAttribution?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Receita por Origem — Monde
                </h2>
                <span className="text-xs text-slate-400">
                  ROAS usa <strong className="text-blue-600">Mídia Paga</strong>; Custo por Oportunidade usa <strong className="text-emerald-600">todas as oportunidades do Pipedrive</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {data.pipedrive.byAttribution.map(group => {
                  const COLORS: Record<string, { badge: string; border: string; bg: string; bar: string }> = {
                    PAID_MEDIA:         { badge: 'bg-blue-100 text-blue-700',    border: 'border-blue-200',   bg: 'bg-blue-50',    bar: 'bg-blue-500' },
                    ORGANIC_COMMERCIAL: { badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-200',  bg: 'bg-amber-50',   bar: 'bg-amber-500' },
                    BRAND_BASE:         { badge: 'bg-violet-100 text-violet-700',border: 'border-violet-200', bg: 'bg-violet-50',  bar: 'bg-violet-500' },
                    UNKNOWN:            { badge: 'bg-slate-100 text-slate-500',  border: 'border-slate-200',  bg: 'bg-slate-50',   bar: 'bg-slate-400' },
                  };
                  const style = COLORS[group.attribution] || COLORS.UNKNOWN;
                  return (
                    <div key={group.attribution} className={`rounded-xl border p-4 ${style.border} ${style.bg}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${style.badge}`}>{group.label}</span>
                        {group.usedForRoi && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">ROAS</span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-slate-900">{fmt(group.receita, 'currency')}</p>
                      <p className="text-xs text-slate-500 mb-2">{fmt(group.receitaPct, 'pct')} da receita total</p>
                      <p className="text-xs text-slate-500">{fmt(group.vendas)} vendas</p>
                      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full ${style.bar} rounded-full`} style={{ width: `${Math.min(group.receitaPct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                <strong className="text-amber-700">Orgânico Comercial</strong> (Indicação, Networking, Prospecção) e{' '}
                <strong className="text-amber-700">Branding/Base</strong> (Espontaneamente) são excluídos do ROI pois
                não têm custo de mídia identificável — incluí-los inflacionaria artificialmente o ROAS.
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
