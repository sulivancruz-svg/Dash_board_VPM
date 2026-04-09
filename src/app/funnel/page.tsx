'use client';

import React, { useState, useEffect } from 'react';
import { Loader, Upload, ArrowRight, Info, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';
import { DateRangeFilter } from '@/components/date-range-filter';

function fmt(n: number, type: 'currency' | 'number' | 'pct' = 'number'): string {
  if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
  if (type === 'pct') return `${n.toFixed(1)}%`;
  return new Intl.NumberFormat('pt-BR').format(n);
}

type ChannelAttribution = 'PAID_MEDIA' | 'ORGANIC_COMMERCIAL' | 'BRAND_BASE' | 'UNKNOWN';

const EMPTY_VALUE = '-';

const ATTR_STYLE: Record<ChannelAttribution, { badge: string; border: string; bg: string; dot: string }> = {
  PAID_MEDIA:         { badge: 'bg-blue-100 text-blue-700',    border: 'border-blue-200',   bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  ORGANIC_COMMERCIAL: { badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-200',  bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  BRAND_BASE:         { badge: 'bg-violet-100 text-violet-700',border: 'border-violet-200', bg: 'bg-violet-50',  dot: 'bg-violet-500' },
  UNKNOWN:            { badge: 'bg-slate-100 text-slate-500',  border: 'border-slate-200',  bg: 'bg-slate-50',   dot: 'bg-slate-400' },
};

const ATTR_LABEL: Record<ChannelAttribution, string> = {
  PAID_MEDIA: 'Mídia Paga',
  ORGANIC_COMMERCIAL: 'Relacionamento Comercial',
  BRAND_BASE: 'Branding / Base',
  UNKNOWN: 'Não Informado',
};


function buildSelectedPeriodLabel(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };

  return `${startDate.toLocaleDateString('pt-BR', options)} - ${endDate.toLocaleDateString('pt-BR', options)}`;
}

interface AttributionGroup {
  attribution: ChannelAttribution;
  label: string;
  description: string;
  receita: number;
  vendas: number;
  leads: number;
  totalCanais: number;
  canais: string[];
  receitaPct: number;
  vendasPct: number;
  usedForRoi: boolean;
}

interface ChannelRow {
  canal: string;
  attribution: ChannelAttribution;
  leads: number;
  qualificados: number;
  vendas: number;
  receita: number;
  ticket: number;
  receitaPct: number;
  vendasPct: number;
}

interface MonthRow {
  month: string;
  year?: number;
  leads: number;
  qualified: number;
  sales: number;
}

interface ChannelsData {
  hasData: boolean;
  periodoMonde?: string;
  sources?: {
    sdrEnabled: boolean;
    pipedriveEnabled: boolean;
    sdrHasData: boolean;
    pipedriveHasData: boolean;
  };
  summary: {
    totalReceita: number;
    totalVendas: number;
    totalLeads: number;
    totalLost: number;
    totalQualified: number;
    ticketMedio: number;
    receitaMidiaPaga: number;
    vendasMidiaPaga: number;
  };
  channels: ChannelRow[];
  byAttribution: AttributionGroup[];
  months?: MonthRow[];
}


function ConvBadge({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  const color = value >= thresholds[1] ? 'text-emerald-600' : value >= thresholds[0] ? 'text-amber-600' : 'text-red-500';
  return <span className={`text-sm font-semibold tabular-nums ${color}`}>{fmt(value, 'pct')}</span>;
}

function FunnelStep({
  label, value, sub, color, source, note,
}: {
  label: string; value: string; sub?: string; color: string; source?: string; note?: string;
}) {
  return (
    <div className={`flex-1 min-w-[120px] ${color} rounded-2xl p-4 text-center relative`}>
      {source && (
        <span className="absolute top-2 right-2 text-[10px] font-bold opacity-60 uppercase tracking-wider">{source}</span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
      {note && <p className="text-[10px] opacity-60 mt-0.5">{note}</p>}
    </div>
  );
}

export default function FunnelPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [data, setData] = useState<ChannelsData | null>(null);
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
      .then(r => r.json())
      .then(payload => {
        if (!controller.signal.aborted) {
          setData(payload);
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


  const totalLeads         = data?.summary?.totalLeads || 0;
  const totalLost          = data?.summary?.totalLost || 0;
  const totalQualificados  = data?.summary?.totalQualified || 0;
  const totalVendas        = data?.summary?.totalVendas || 0;
  const totalReceita       = data?.summary?.totalReceita || 0;
  const receitaMidiaPaga   = data?.summary?.receitaMidiaPaga || 0;
  const vendasMidiaPaga    = data?.summary?.vendasMidiaPaga || 0;

  const convLQ    = totalLeads        > 0 && totalQualificados > 0 ? (totalQualificados / totalLeads) * 100 : null;
  const convQV    = totalQualificados > 0 && totalVendas       > 0 ? (totalVendas / totalQualificados) * 100 : null;
  const convGeral = totalLeads        > 0 && totalVendas       > 0 ? (totalVendas / totalLeads) * 100 : null;

  const byAttribution = data?.byAttribution || [];
  const months = data?.months || [];
  const showSdr = !!(data?.sources?.sdrEnabled && data?.sources?.sdrHasData);
  const hasPipedrive = !!(data?.sources?.pipedriveHasData);
  const showLeads = totalLeads > 0;
  const leadsSource = hasPipedrive ? 'PIPE' : 'SDR';
  const selectedPeriodLabel = buildSelectedPeriodLabel(dateRange.start, dateRange.end);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">AnÃƒÂ¡lise Comercial</p>
          <h1 className="text-2xl font-bold text-slate-900">Funil Comercial</h1>
          {data?.periodoMonde && (
            <p className="text-xs text-slate-400 mt-1">Monde: {data.periodoMonde}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter
            activePeriod={activePeriod}
            dateRange={dateRange}
            onPresetSelect={setPresetPeriod}
            onRangeChange={setCustomDateRange}
          />
          <Link href="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <Upload className="w-4 h-4" />
            Importar planilha
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Carregando...</span>
        </div>
      ) : !data?.hasData ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-2">Nenhum dado importado</h3>
          <p className="text-sm text-slate-500 mb-5">Importe as planilhas ativas para visualizar o funil.</p>
          <Link href="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <Upload className="w-4 h-4" />
            Ir para ConfiguraÃƒÂ§ÃƒÂµes
          </Link>
        </div>
      ) : (
        <>
          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Funil Visual Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Funil Geral</h2>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Oportunidades (todos os deals do Pipe)</span>
                {showSdr && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />SDR</span>}
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Monde</span>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {/* Leads Ã¢â‚¬â€ todos os deals Pipedrive */}
              {showLeads && (
                <>
                  <FunnelStep
                    label="Oportunidades"
                    value={fmt(totalLeads)}
                    sub="base PIPE por ID"
                    color="bg-blue-500 text-white"
                    source={leadsSource}
                  />
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </>
              )}

              {/* Qualificados Ã¢â‚¬â€ SDR (opcional) */}
              {showSdr && totalQualificados > 0 && (
                <>
                  <FunnelStep
                    label="Qualificados"
                    value={fmt(totalQualificados)}
                    sub={convLQ ? `${fmt(convLQ, 'pct')} conv.` : undefined}
                    color="bg-violet-500 text-white"
                    source="SDR"
                  />
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </>
              )}

              {/* Vendas (Ganho) Ã¢â‚¬â€ Monde */}
              <FunnelStep
                label="Vendas (Ganho)"
                value={fmt(totalVendas)}
                sub={convGeral ? `${fmt(convGeral, 'pct')} conv.` : undefined}
                color="bg-emerald-500 text-white"
                source="Monde"
              />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

              {/* Receita Ã¢â‚¬â€ Monde */}
              <FunnelStep
                label="Receita Total"
                value={fmt(totalReceita, 'currency')}
                sub={`ticket: ${fmt(data?.summary?.ticketMedio, 'currency')}`}
                color="bg-teal-600 text-white"
                source="Monde"
              />
            </div>

            {/* Taxas de conversÃƒÂ£o + Perdidos */}
            {(convGeral || convLQ || convQV || totalLost > 0) && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {convGeral !== null && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Oportunidade {'->'} Venda</p>
                      <ConvBadge value={convGeral} thresholds={[10, 30]} />
                    </div>
                  )}
                  {totalLost > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Perdidos</p>
                      <span className="text-sm font-semibold tabular-nums text-red-500">{fmt(totalLost)}</span>
                    </div>
                  )}
                  {convLQ !== null && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Oportunidade {'->'} Qualif.</p>
                      <ConvBadge value={convLQ} thresholds={[10, 20]} />
                    </div>
                  )}
                  {convQV !== null && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Qualif. Ã¢â€ â€™ Venda</p>
                      <ConvBadge value={convQV} thresholds={[10, 20]} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Receita por Origem Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {byAttribution.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Receita por Origem</h2>
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">ROAS usa mídia paga; Custo por Oportunidade usa todas as oportunidades</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {byAttribution.map(group => {
                  const style = ATTR_STYLE[group.attribution];
                  return (
                    <div key={group.attribution}
                      className={`rounded-xl border p-4 ${style.border} ${style.bg}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${style.badge}`}>
                          {group.label}
                        </span>
                        {group.usedForRoi && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">ROI</span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-slate-900 mb-0.5">{fmt(group.receita, 'currency')}</p>
                      <p className="text-xs text-slate-500 mb-2">{fmt(group.receitaPct, 'pct')} da receita total</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{fmt(group.vendas)} vendas</span>
                        <span>{group.totalCanais} {group.totalCanais === 1 ? 'canal' : 'canais'}</span>
                      </div>
                      {/* barra de progresso */}
                      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full ${style.dot} rounded-full`}
                          style={{ width: `${Math.min(group.receitaPct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nota explicativa */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Branding/Base (Espontaneamente)</strong> representa clientes que fizeram contato por conta própria.
                  Pode ser resultado do trabalho de branding, fidelização ou tráfego orgânico acumulado.
                  Não é incluído no ROI de mídia paga, pois não há investimento direto identificável.
                  <strong>Relacionamento Comercial</strong> (Indicação, Networking, Prospecção) também é excluído do ROI:
                  é resultado de relacionamento cultivado, não de investimento em mídia.
                </p>
              </div>
            </div>
          )}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Funil por Canal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Funil por Canal</h2>
              <span className="text-xs text-slate-400">{data.channels.length} canais Â· oportunidades: todos os deals por canal</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Canal / Origem</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Oportunidades</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qualif.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Vendas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Receita</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.channels.map(c => {
                    const style = ATTR_STYLE[c.attribution];
                    return (
                      <tr key={c.canal} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                            <div>
                              <p className="text-sm font-semibold text-slate-800 leading-snug">{c.canal}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${style.badge}`}>
                                {ATTR_LABEL[c.attribution]}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-right">{c.leads > 0 ? fmt(c.leads) : EMPTY_VALUE}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-right">{c.qualificados > 0 ? fmt(c.qualificados) : EMPTY_VALUE}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">{fmt(c.vendas)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-right">{fmt(c.vendasPct, 'pct')}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700 text-right whitespace-nowrap">{fmt(c.receita, 'currency')}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(c.receitaPct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums">{fmt(c.receitaPct, 'pct')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-right whitespace-nowrap">{fmt(c.ticket, 'currency')}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">{totalLeads > 0 ? fmt(totalLeads) : EMPTY_VALUE}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">{data?.summary?.totalQualified > 0 ? fmt(data?.summary?.totalQualified) : EMPTY_VALUE}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">{fmt(totalVendas)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">100%</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700 text-right">{fmt(totalReceita, 'currency')}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">100%</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">{fmt(data?.summary?.ticketMedio, 'currency')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Funil por MÃƒÂªs (SDR) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {months.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Funil por MÃƒÂªs</h2>
                <span className="text-xs text-slate-400">{months.length} meses Ã‚Â· fonte: SDR</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">MÃƒÂªs</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Leads</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qualificados</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Conv. LÃ¢â€ â€™Q</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas SDR</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Conv. QÃ¢â€ â€™V</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {months.map(m => {
                      const mLQ = m.leads > 0 && m.qualified > 0 ? (m.qualified / m.leads) * 100 : null;
                      const mQV = m.qualified > 0 && m.sales > 0 ? (m.sales / m.qualified) * 100 : null;
                      return (
                        <tr key={`${m.year}-${m.month}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-slate-800 capitalize">{m.month}</span>
                            {m.year && <span className="ml-1.5 text-xs text-slate-400">{m.year}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 text-right">{fmt(m.leads)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 text-right">{fmt(m.qualified)}</td>
                          <td className="px-4 py-3 text-right">
                            {mLQ !== null ? <ConvBadge value={mLQ} thresholds={[10, 20]} /> : <span className="text-sm text-slate-300">Ã¢â‚¬â€</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">{fmt(m.sales)}</td>
                          <td className="px-4 py-3 text-right">
                            {mQV !== null ? <ConvBadge value={mQV} thresholds={[10, 20]} /> : <span className="text-sm text-slate-300">Ã¢â‚¬â€</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">{fmt(totalLeads)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">{fmt(data?.summary?.totalQualified)}</td>
                      <td className="px-4 py-3 text-right">
                        {convLQ !== null ? <ConvBadge value={convLQ} thresholds={[10, 20]} /> : <span className="text-sm text-slate-300">Ã¢â‚¬â€</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">{fmt(data?.summary?.totalQualified > 0 ? months.reduce((s, m) => s + m.sales, 0) : 0)}</td>
                      <td className="px-4 py-3 text-right">
                        {convQV !== null ? <ConvBadge value={convQV} thresholds={[10, 20]} /> : <span className="text-sm text-slate-300">Ã¢â‚¬â€</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

