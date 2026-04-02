'use client';

import React, { useEffect, useState } from 'react';
import { Loader, Upload } from 'lucide-react';
import Link from 'next/link';
import { ATTRIBUTION_COLORS, ATTRIBUTION_LABELS, type ChannelAttribution } from '@/lib/channel-mapping';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';

function fmt(n: number, type: 'currency' | 'number' | 'pct' = 'number'): string {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(n);
  }
  if (type === 'pct') return `${n.toFixed(1)}%`;
  return new Intl.NumberFormat('pt-BR').format(n);
}

interface ChannelRow {
  canal: string;
  leads: number;
  qualificados: number;
  vendas: number;
  receita: number;
  ticket: number;
  receitaPct: number;
  vendasPct: number;
  attribution?: string;
}

interface ChannelsData {
  hasData: boolean;
  updatedAt: string | null;
  summary: {
    totalReceita: number;
    totalVendas: number;
    totalLeads: number;
    ticketMedio: number;
    totalCanais: number;
  };
  channels: ChannelRow[];
}

interface OverviewMediaData {
  periodLabel: string;
  meta: {
    connected: boolean;
    investimento: number;
  };
  googleAds: {
    connected: boolean;
    investimento: number;
    channelBreakdown?: Array<{
      channelType: string;
      channelSubType: string | null;
      spend: number;
      campaigns: number;
    }>;
  };
  pipedrive: {
    receitaMidiaPaga: number;
    vendasMidiaPaga: number;
    oportunidadesConvertidas: number;
  };
  kpis: {
    investimento: number;
    receitaMidiaPaga: number;
    vendasMidiaPaga: number;
    roi: number | null;
    cpl: number | null;
    conversionRate: number | null;
  };
}

const EMPTY_VALUE = '-';

function BarCell({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 flex-shrink-0 rounded-full bg-slate-100 h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="w-8 text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
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
  return channelSubType ? `${type} / ${channelSubType}` : 'Nao classificado';
}

function buildSelectedPeriodLabel(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };

  return `${startDate.toLocaleDateString('pt-BR', options)} - ${endDate.toLocaleDateString('pt-BR', options)}`;
}

export default function ChannelsPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [data, setData] = useState<ChannelsData | null>(null);
  const [mediaData, setMediaData] = useState<OverviewMediaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      period: activePeriod === 'custom' ? '30' : activePeriod,
      start: dateRange.start,
      end: dateRange.end,
    });
    const controller = new AbortController();

    setLoading(true);
    fetch(`/api/data/channels?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (!controller.signal.aborted) {
          setData(payload);
        }
      })
      .catch((error) => {
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

  useEffect(() => {
    const params = new URLSearchParams({
      period: activePeriod === 'custom' ? '30' : activePeriod,
      start: dateRange.start,
      end: dateRange.end,
    });
    const controller = new AbortController();

    fetch(`/api/data/overview?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (!controller.signal.aborted) {
          setMediaData(payload);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      });

    return () => controller.abort();
  }, [activePeriod, dateRange.end, dateRange.start]);

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const selectedPeriodLabel = buildSelectedPeriodLabel(dateRange.start, dateRange.end);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Resultados Comerciais</p>
          <h1 className="text-2xl font-bold text-slate-900">Canais & Receita</h1>
          {updatedAt && <p className="mt-0.5 text-xs text-slate-400">Atualizado em {updatedAt}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            activePeriod={activePeriod}
            dateRange={dateRange}
            onPresetSelect={setPresetPeriod}
            onRangeChange={setCustomDateRange}
          />
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            Importar planilha
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Carregando...</span>
        </div>
      ) : !data?.hasData ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Upload className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-slate-700">Nenhum dado importado</h3>
          <p className="mb-5 text-sm text-slate-500">
            Importe as planilhas de SDR ou Pipedrive para visualizar os resultados por canal.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            Ir para Configuracoes
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="Receita Total"
              value={fmt(data.summary.totalReceita, 'currency')}
              sub={`${data.summary.totalCanais} canais`}
              color="text-emerald-700"
            />
            <KpiCard
              label="Vendas Fechadas"
              value={fmt(data.summary.totalVendas)}
              sub="negocios ganhos"
              color="text-blue-700"
            />
            <KpiCard
              label="Ticket Medio"
              value={fmt(data.summary.ticketMedio, 'currency')}
              sub="por negocio"
              color="text-violet-700"
            />
            <KpiCard
              label="Oportunidades Totais"
              value={fmt(data.summary.totalLeads)}
              sub="no periodo"
              color="text-amber-700"
            />
          </div>

          {mediaData && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Midia Paga Integrada</h2>
                  <p className="mt-1 text-xs text-slate-400">Periodo analisado: {selectedPeriodLabel}</p>
                </div>
                <span className="text-xs text-slate-400">Receita e vendas pagas usam a atribuicao do Pipe Monde</span>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900">Meta Ads</h3>
                    <span className="text-xs font-semibold text-blue-700">
                      {mediaData.meta.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{fmt(mediaData.meta.investimento, 'currency')}</p>
                  <p className="mt-1 text-xs text-blue-700">Investimento do periodo</p>
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-orange-900">Google Ads</h3>
                    <span className="text-xs font-semibold text-orange-700">
                      {mediaData.googleAds.connected ? 'Importado' : 'Nao importado'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{fmt(mediaData.googleAds.investimento, 'currency')}</p>
                  <p className="mt-1 text-xs text-orange-700">Investimento do periodo</p>
                  {mediaData.googleAds.channelBreakdown && mediaData.googleAds.channelBreakdown.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {mediaData.googleAds.channelBreakdown.slice(0, 4).map((item) => (
                        <span
                          key={`${item.channelType}-${item.channelSubType || 'none'}`}
                          className="inline-flex items-center rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-orange-700"
                        >
                          {getGoogleChannelLabel(item.channelType, item.channelSubType)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-emerald-900">Resultado Pago</h3>
                    <span className="text-xs font-semibold text-emerald-700">Google + Meta</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{fmt(mediaData.pipedrive.receitaMidiaPaga, 'currency')}</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {fmt(mediaData.pipedrive.vendasMidiaPaga)} vendas Meta + Google no Pipe Monde
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-emerald-200 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-emerald-700">ROAS</p>
                      <p className="text-sm font-bold text-emerald-900">
                        {mediaData.kpis.roi !== null ? `${mediaData.kpis.roi.toFixed(1)}x` : EMPTY_VALUE}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-emerald-700">Custo por Oportunidade</p>
                      <p className="text-sm font-bold text-emerald-900">
                        {mediaData.kpis.cpl !== null ? fmt(mediaData.kpis.cpl, 'currency') : EMPTY_VALUE}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">Top Canais por Receita</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.channels.slice(0, 6).map((channel, index) => {
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500'];
                const textColors = ['text-blue-700', 'text-emerald-700', 'text-violet-700', 'text-amber-700', 'text-teal-700', 'text-rose-700'];
                const bgColors = ['bg-blue-50', 'bg-emerald-50', 'bg-violet-50', 'bg-amber-50', 'bg-teal-50', 'bg-rose-50'];

                return (
                  <div key={channel.canal} className={`${bgColors[index]} rounded-xl border border-slate-200 p-5`}>
                    <div className="mb-3 flex items-start justify-between">
                      <div className={`mt-1.5 h-2 w-2 rounded-full ${colors[index]}`} />
                      <span className={`text-xs font-bold ${textColors[index]}`}>{channel.receitaPct}% da receita</span>
                    </div>
                    <p className="mb-1.5 text-sm font-semibold leading-tight text-slate-800">{channel.canal}</p>
                    {channel.attribution && channel.attribution !== 'UNKNOWN' && (
                      <span
                        className={`mb-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          ATTRIBUTION_COLORS[channel.attribution as ChannelAttribution]?.badge || 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ATTRIBUTION_LABELS[channel.attribution as ChannelAttribution] || channel.attribution}
                      </span>
                    )}
                    <p className={`mb-1 text-xl font-bold ${textColors[index]}`}>{fmt(channel.receita, 'currency')}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                      <div>
                        <p className="text-xs text-slate-400">Vendas</p>
                        <p className="text-sm font-semibold text-slate-700">{fmt(channel.vendas)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Ticket Medio</p>
                        <p className="text-sm font-semibold text-slate-700">{fmt(channel.ticket, 'currency')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Todos os Canais</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Canal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Oportunidades</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vendas</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">% Vendas</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Receita</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">% Receita</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket Medio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.channels.map((channel) => (
                    <tr key={channel.canal} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{channel.canal}</p>
                        {channel.attribution && channel.attribution !== 'UNKNOWN' && (
                          <span
                            className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              ATTRIBUTION_COLORS[channel.attribution as ChannelAttribution]?.badge || 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ATTRIBUTION_LABELS[channel.attribution as ChannelAttribution] || channel.attribution}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{channel.leads > 0 ? fmt(channel.leads) : EMPTY_VALUE}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{fmt(channel.vendas)}</td>
                      <td className="px-4 py-3">
                        <BarCell pct={channel.vendasPct} color="bg-blue-400" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-emerald-700">
                        {fmt(channel.receita, 'currency')}
                      </td>
                      <td className="px-4 py-3">
                        <BarCell pct={channel.receitaPct} color="bg-emerald-400" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{fmt(channel.ticket, 'currency')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{fmt(data.summary.totalLeads)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{fmt(data.summary.totalVendas)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-500">100%</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-emerald-700">
                      {fmt(data.summary.totalReceita, 'currency')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-500">100%</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-700">
                      {fmt(data.summary.ticketMedio, 'currency')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
