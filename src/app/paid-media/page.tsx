'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader, Target,
  Eye, MousePointer, DollarSign, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';
import { DateRangeFilter } from '@/components/date-range-filter';

function fmt(n: number, type: 'currency' | 'number' | 'pct' | 'decimal' = 'number'): string {
  if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
  if (type === 'pct') return `${n.toFixed(2)}%`;
  if (type === 'decimal') return n.toFixed(2);
  return new Intl.NumberFormat('pt-BR').format(n);
}

// ──────────────────────────────────────────────────
// Tipos Meta
// ──────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; spend: number; spendPct: number;
  impressions: number; reach: number; frequency: number;
  clicks: number; ctr: number; cpc: number; cpm: number;
  results: number; cpr: number;
  objectiveRaw?: string | null;
  objectiveLabel?: string;
  strategicObjective?: string;
}

interface CampaignsData {
  period: string; accountName: string;
  summary: {
    totalSpend: number; totalImpressions: number; totalReach: number;
    totalClicks: number; totalResults: number; totalWhatsAppConversations: number;
    avgCtr: number; avgCpc: number; avgCpm: number; avgCpr: number; avgCostPerWhatsAppConversation: number;
  };
  campaigns: Campaign[]; adsets: any[]; ads: any[];
  highlights: {
    bestCpr: Campaign | null; worstCpr: Campaign | null;
    topSpend: Campaign | null; concentrated: Campaign[];
  };
  objectiveBreakdown: Array<{
    strategicObjective: string;
    spend: number;
    results: number;
    count: number;
  }>;
}

// ──────────────────────────────────────────────────
// Tipos Google Ads
// ──────────────────────────────────────────────────
interface GoogleAdsMonth {
  month: string; year: number; spend: number; clicks: number; impressions: number;
}

interface GoogleAdsCampaign {
  campaignId: string;
  campaignName: string;
  channelType?: string;
  channelSubType?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface GoogleAdsData {
  updatedAt?: string; accountName?: string;
  totalSpend: number; totalClicks: number; totalImpressions: number;
  periodDays?: number | null;
  monthsCount?: number; months: GoogleAdsMonth[];
  campaigns?: GoogleAdsCampaign[];
  channelBreakdown?: Array<{
    channelType: string;
    channelSubType: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    campaigns: number;
  }>;
}

function getChannelLabel(channelType?: string, channelSubType?: string | null): string {
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

// ──────────────────────────────────────────────────
// Componentes de UI reutilizáveis
// ──────────────────────────────────────────────────
function SummaryCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  const [sortField, setSortField] = useState<keyof Campaign>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'all' | 'best' | 'worst'>('all');

  const sorted = [...campaigns].sort((a, b) => {
    const av = a[sortField] as number;
    const bv = b[sortField] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const filtered = activeTab === 'best'
    ? [...campaigns].filter(c => c.results > 0).sort((a, b) => a.cpr - b.cpr).slice(0, 5)
    : activeTab === 'worst'
    ? [...campaigns].filter(c => c.results > 0).sort((a, b) => b.cpr - a.cpr).slice(0, 5)
    : sorted;

  const handleSort = (field: keyof Campaign) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const Th = ({ label, field }: { label: string; field?: keyof Campaign }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${field ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
      onClick={() => field && handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {field && sortField === field && <span className="text-blue-500">{sortDir === 'desc' ? '↓' : '↑'}</span>}
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Campanhas</h2>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {(['all', 'best', 'worst'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'all' ? 'Todas' : tab === 'best' ? '🏆 Melhores' : '⚠️ Piores'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <Th label="Campanha" /><Th label="Invest." field="spend" /><Th label="% Total" field="spendPct" />
              <Th label="Objetivo" />
              <Th label="Impressoes" field="impressions" /><Th label="Alcance" field="reach" />
              <Th label="Freq." field="frequency" /><Th label="CTR" field="ctr" />
              <Th label="CPC" field="cpc" /><Th label="CPM" field="cpm" />
              <Th label="Result." field="results" /><Th label="CPR" field="cpr" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-400">Nenhuma campanha com dados</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3"><p className="text-sm font-medium text-slate-800 max-w-xs truncate" title={c.name}>{c.name}</p></td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{fmt(c.spend, 'currency')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-14 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(c.spendPct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{c.spendPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    {c.strategicObjective || c.objectiveLabel || 'Nao classificado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(c.impressions)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(c.reach)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{c.frequency.toFixed(1)}x</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-sm font-medium ${c.ctr >= 1.5 ? 'text-emerald-600' : c.ctr >= 0.8 ? 'text-amber-600' : 'text-red-500'}`}>
                    {fmt(c.ctr, 'pct')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(c.cpc, 'currency')}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(c.cpm, 'currency')}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{fmt(c.results)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{c.cpr > 0 ? fmt(c.cpr, 'currency') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdsTable({ ads, title }: { ads: any[]; title: string }) {
  if (ads.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
      <p className="text-sm text-slate-400">{title}: nenhum dado disponível</p>
    </div>
  );
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Campanha / Conjunto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invest.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Impressoes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CTR</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPC</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Result.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ads.slice(0, 20).map((a: any, i: number) => (
              <tr key={a.id || i} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-xs truncate" title={a.name}>{a.name}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{a.adsetName || a.campaignName || '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{fmt(a.spend, 'currency')}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(a.impressions)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(a.ctr, 'pct')}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(a.cpc, 'currency')}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{fmt(a.results)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{a.cpr > 0 ? fmt(a.cpr, 'currency') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetaObjectivePanel({ items, totalSpend }: { items: CampaignsData['objectiveBreakdown']; totalSpend: number }) {
  if (!items.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Meta por objetivo</h2>
        <span className="text-xs text-slate-400">Alcance, Remarketing, Captacao e outros</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {items.map((item) => {
          const spendPct = totalSpend > 0 ? (item.spend / totalSpend) * 100 : 0;
          return (
            <div key={item.strategicObjective} className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">{item.strategicObjective}</span>
                <span className="text-[11px] text-slate-400">{item.count} camp.</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{fmt(item.spend, 'currency')}</p>
              <p className="text-xs text-slate-500 mt-1">{item.results} resultados</p>
              <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(spendPct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────────
// Painel Google Ads (dados importados via CSV)
// ──────────────────────────────────────────────────
function GoogleAdsPanel({ data }: { data: GoogleAdsData }) {
  const avgCpc = data.totalClicks > 0 ? data.totalSpend / data.totalClicks : 0;
  const avgCpm = data.totalImpressions > 0 ? (data.totalSpend / data.totalImpressions) * 1000 : 0;
  const ctr = data.totalImpressions > 0 ? (data.totalClicks / data.totalImpressions) * 100 : 0;
  const campaigns = data.campaigns || [];
  const breakdown = data.channelBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Investimento Total"
          value={fmt(data.totalSpend, 'currency')}
          sub={data.periodDays ? `ultimos ${data.periodDays} dias` : `${data.monthsCount} ${data.monthsCount === 1 ? 'mes' : 'meses'} importados`}
          icon={<DollarSign className="w-5 h-5 text-orange-600" />}
          accent="bg-orange-50"
        />
        <SummaryCard
          label="Impressoes"
          value={fmt(data.totalImpressions)}
          sub={`CPM medio: ${fmt(avgCpm, 'currency')}`}
          icon={<Eye className="w-5 h-5 text-violet-600" />}
          accent="bg-violet-50"
        />
        <SummaryCard
          label="Cliques"
          value={fmt(data.totalClicks)}
          sub={`CTR: ${ctr.toFixed(2)}%`}
          icon={<MousePointer className="w-5 h-5 text-blue-600" />}
          accent="bg-blue-50"
        />
        <SummaryCard
          label="CPC Medio"
          value={avgCpc > 0 ? fmt(avgCpc, 'currency') : '—'}
          sub="custo por clique"
          icon={<Target className="w-5 h-5 text-emerald-600" />}
          accent="bg-emerald-50"
        />
      </div>

      {breakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Verba por tipo de campanha</h2>
            <span className="text-xs text-slate-400">Search, Display, PMAX e outros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {breakdown.map((item) => {
              const spendPct = data.totalSpend > 0 ? (item.spend / data.totalSpend) * 100 : 0;
              return (
                <div key={`${item.channelType}-${item.channelSubType || 'none'}`} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">{getChannelLabel(item.channelType, item.channelSubType)}</span>
                    <span className="text-[11px] text-slate-400">{item.campaigns} camp.</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{fmt(item.spend, 'currency')}</p>
                  <p className="text-xs text-slate-500 mt-1">{spendPct.toFixed(1)}% da verba</p>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(spendPct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela mensal */}
      {data.months && data.months.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Desempenho por Mes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Investimento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Impressoes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliques</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CTR</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">% Invest.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.months.map((m) => {
                  const mCpc = m.clicks > 0 ? m.spend / m.clicks : 0;
                  const mCtr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
                  const mPct = data.totalSpend > 0 ? (m.spend / data.totalSpend) * 100 : 0;
                  return (
                    <tr key={`${m.month}-${m.year}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-800 capitalize">{m.month}</span>
                        <span className="text-xs text-slate-400 ml-1.5">{m.year}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-orange-600 whitespace-nowrap">{fmt(m.spend, 'currency')}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(m.impressions)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(m.clicks)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${mCtr >= 5 ? 'text-emerald-600' : mCtr >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                          {mCtr.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{mCpc > 0 ? fmt(mCpc, 'currency') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${Math.min(mPct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{mPct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-orange-700">{fmt(data.totalSpend, 'currency')}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">{fmt(data.totalImpressions)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">{fmt(data.totalClicks)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">{ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">{avgCpc > 0 ? fmt(avgCpc, 'currency') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Dica de contexto */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-orange-700 mb-1">Sobre os dados do Google Ads</p>
        <p className="text-xs text-orange-600">
          Esses dados sao importados via CSV exportado do Google Ads. Para atualizar, acesse
          <strong> Configuracoes → Importar Google Ads</strong> e exporte um novo relatorio.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Página principal — Mídia Paga
// ──────────────────────────────────────────────────
export default function PaidMediaPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [activeSource, setActiveSource] = useState<'meta' | 'google'>('meta');

  const [metaData, setMetaData] = useState<CampaignsData | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [googleData, setGoogleData] = useState<GoogleAdsData | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [paidChannels, setPaidChannels] = useState<Array<{
    canal: string; vendas: number; receita: number; ticket: number; receitaPct: number; attribution?: string;
  }>>([]);

  // Busca Meta
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setMetaLoading(true);
        setMetaError(null);
        const period = activePeriod === 'custom' ? '30' : activePeriod;
        const params = new URLSearchParams({
          period,
          start: dateRange.start,
          end: dateRange.end,
        });
        const res = await fetch(`/api/meta/campaigns?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao buscar dados Meta');
        }
        setMetaData(await res.json());
      } catch (err) {
        setMetaError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setMetaLoading(false);
      }
    };
    fetchMeta();
  }, [activePeriod, dateRange.end, dateRange.start]);

  // Busca Google Ads (uma vez, não depende de period pois é CSV importado)
  useEffect(() => {
    if (activeSource !== 'google') return;

    const fetchGoogle = async () => {
      try {
        setGoogleLoading(true);
        setGoogleError(null);
        const period = activePeriod === 'custom' ? '30' : activePeriod;
        const params = new URLSearchParams({
          period,
          start: dateRange.start,
          end: dateRange.end,
        });
        const res = await fetch(`/api/imports/google-ads?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 404) {
            setGoogleData(null);
          } else {
            throw new Error('Erro ao buscar dados Google Ads');
          }
          return;
        }
        const payload = await res.json();
        setGoogleData({
          ...payload,
          monthsCount: payload.monthsCount ?? payload.months?.length ?? 0,
        });
      } catch (err) {
        setGoogleError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setGoogleLoading(false);
      }
    };
    fetchGoogle();
  }, [activeSource, activePeriod, dateRange.end, dateRange.start]);

  // Busca canais pagos (Monde/Pipedrive)
  useEffect(() => {
    const period = activePeriod === 'custom' ? '30' : activePeriod;
    const params = new URLSearchParams({
      period,
      start: dateRange.start,
      end: dateRange.end,
    });

    fetch(`/api/data/channels?${params.toString()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const paid = (d.channels ?? []).filter((c: any) => c.attribution === 'PAID_MEDIA');
        setPaidChannels(paid);
      })
      .catch(console.error);
  }, [activePeriod, dateRange.end, dateRange.start]);

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Trafego Pago</p>
          <h1 className="text-2xl font-bold text-slate-900">Midia Paga</h1>
          <p className="text-sm text-slate-400 mt-0.5">Meta Ads e Google Ads</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Período só aparece quando Meta está ativo */}
          <DateRangeFilter
            activePeriod={activePeriod}
            dateRange={dateRange}
            onPresetSelect={setPresetPeriod}
            onRangeChange={setCustomDateRange}
          />
        </div>
      </div>

      {/* ── Receita por Canal Pago — Monde ── */}
      {paidChannels.length > 0 && (() => {
        const totalReceita = paidChannels.reduce((s, c) => s + c.receita, 0);
        const totalVendas = paidChannels.reduce((s, c) => s + c.vendas, 0);
        const totalTicket = totalVendas > 0 ? totalReceita / totalVendas : 0;
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Receita por Canal Pago — Monde</h2>
                <p className="text-xs text-blue-500 mt-0.5">Google · Redes Sociais · Site — dados históricos da base Monde</p>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs font-medium text-blue-600">Receita (Canais Pagos)</p>
                  <p className="text-xl font-bold text-blue-900">{fmt(totalReceita, 'currency')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-blue-600">Vendas</p>
                  <p className="text-xl font-bold text-blue-900">{totalVendas}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-blue-600">Ticket Médio</p>
                  <p className="text-xl font-bold text-blue-900">{fmt(totalTicket, 'currency')}</p>
                </div>
              </div>
            </div>
            <div className={`grid grid-cols-1 gap-3 ${paidChannels.length === 1 ? 'max-w-xs' : paidChannels.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {paidChannels.map(c => (
                <div key={c.canal} className="bg-white rounded-lg border border-blue-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 truncate" title={c.canal}>{c.canal}</p>
                  <p className="text-2xl font-bold text-slate-900">{fmt(c.receita, 'currency')}</p>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400">Vendas</p>
                      <p className="text-sm font-bold text-slate-700">{c.vendas}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Ticket</p>
                      <p className="text-sm font-bold text-slate-700">{fmt(c.ticket, 'currency')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">% Receita</p>
                      <p className="text-sm font-bold text-blue-700">{c.receitaPct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Tabs de fonte ── */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveSource('meta')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeSource === 'meta' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Meta Ads
          {metaData && (
            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {fmt(metaData.summary.totalSpend, 'currency')}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSource('google')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeSource === 'google' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          Google Ads
          {googleData && (
            <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
              {fmt(googleData.totalSpend, 'currency')}
            </span>
          )}
        </button>
      </div>

      {/* ── Conteúdo Meta Ads ── */}
      {activeSource === 'meta' && (
        <>
          {metaLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-slate-500">Carregando dados da Meta...</span>
            </div>
          ) : metaError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-700 font-medium mb-2">⚠️ {metaError}</p>
              <p className="text-red-600 text-sm">
                Acesse <Link href="/settings" className="underline font-semibold">Configuracoes</Link> para conectar seu token.
              </p>
            </div>
          ) : metaData ? (
            <>
              <MetaObjectivePanel items={metaData.objectiveBreakdown || []} totalSpend={metaData.summary.totalSpend} />

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard label="Investimento Total" value={fmt(metaData.summary.totalSpend, 'currency')} sub={`${metaData.campaigns.length} campanhas ativas`} icon={<DollarSign className="w-5 h-5 text-blue-600" />} accent="bg-blue-50" />
                <SummaryCard label="Impressoes" value={fmt(metaData.summary.totalImpressions)} sub={`Alcance: ${fmt(metaData.summary.totalReach)}`} icon={<Eye className="w-5 h-5 text-violet-600" />} accent="bg-violet-50" />
                <SummaryCard label="CTR Medio" value={fmt(metaData.summary.avgCtr, 'pct')} sub={`CPC medio: ${fmt(metaData.summary.avgCpc, 'currency')}`} icon={<MousePointer className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-50" />
                <SummaryCard
                  label="Conversas WhatsApp"
                  value={fmt(metaData.summary.totalWhatsAppConversations)}
                  sub={
                    metaData.summary.totalWhatsAppConversations > 0
                      ? `Custo por conversa: ${fmt(metaData.summary.avgCostPerWhatsAppConversation, 'currency')}`
                      : 'Nenhuma conversa no periodo'
                  }
                  icon={<Target className="w-5 h-5 text-amber-600" />}
                  accent="bg-amber-50"
                />
              </div>

              {/*
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {metaData.highlights.bestCpr && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Melhor Performance</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate mb-1">{metaData.highlights.bestCpr.name}</p>
                      <p className="text-xl font-bold text-emerald-700">{fmt(metaData.highlights.bestCpr.cpr, 'currency')} / result.</p>
                      <p className="text-xs text-emerald-600 mt-1">{metaData.highlights.bestCpr.results} resultados · {fmt(metaData.highlights.bestCpr.spend, 'currency')}</p>
                    </div>
                  )}
                  {metaData.highlights.worstCpr && metaData.highlights.worstCpr.id !== metaData.highlights.bestCpr?.id && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Pior Performance</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate mb-1">{metaData.highlights.worstCpr.name}</p>
                      <p className="text-xl font-bold text-red-600">{fmt(metaData.highlights.worstCpr.cpr, 'currency')} / result.</p>
                      <p className="text-xs text-red-500 mt-1">{metaData.highlights.worstCpr.results} resultados · {fmt(metaData.highlights.worstCpr.spend, 'currency')}</p>
                    </div>
                  )}
                  {metaData.highlights.concentrated.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Concentracao de Verba</span>
                      </div>
                      {metaData.highlights.concentrated.slice(0, 1).map(c => (
                        <div key={c.id}>
                          <p className="text-sm font-semibold text-slate-800 truncate mb-1">{c.name}</p>
                          <p className="text-xl font-bold text-amber-700">{c.spendPct}% do orcamento</p>
                          <p className="text-xs text-amber-600 mt-1">{fmt(c.spend, 'currency')} concentrados</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              */}

            </>
          ) : null}
        </>
      )}

      {/* ── Conteúdo Google Ads ── */}
      {activeSource === 'google' && (
        <>
          {googleLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-6 h-6 animate-spin text-orange-500" />
              <span className="ml-2 text-sm text-slate-500">Carregando dados do Google Ads...</span>
            </div>
          ) : googleError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-700 font-medium mb-2">⚠️ {googleError}</p>
            </div>
          ) : googleData ? (
            <GoogleAdsPanel data={googleData} />
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-700 mb-2">Google Ads nao importado</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Exporte um relatorio do Google Ads e importe em Configuracoes para ver os dados aqui.
              </p>
              <Link href="/settings"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors">
                Importar Google Ads
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
