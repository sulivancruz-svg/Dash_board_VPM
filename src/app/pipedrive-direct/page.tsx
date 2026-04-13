'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock3,
  Database,
  Key,
  Loader,
  RefreshCw,
  Target,
  TrendingUp,
  Unlink,
  Upload,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';

function fmt(value: number, type: 'number' | 'pct' | 'days' = 'number'): string {
  if (type === 'pct') {
    return `${value.toFixed(1)}%`;
  }

  if (type === 'days') {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} dias`;
  }

  return new Intl.NumberFormat('pt-BR').format(value);
}

interface PipedriveDirectPayload {
  configured: boolean;
  companyName: string;
  companyDomain: string;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastSync: {
    updatedAt: string;
    totalDeals: number;
    totalWon: number;
    totalOpen: number;
    totalLost: number;
  } | null;
  period: {
    start: string;
    end: string;
    periodDays: number;
  };
  data: {
    updatedAt: string;
    companyName: string;
    companyDomain: string;
    period: {
      start: string;
      end: string;
    };
    fields: {
      channelFieldName: string | null;
      howArrivedFieldName: string | null;
    };
    summary: {
      opportunities: number;
      won: number;
      lost: number;
      open: number;
      winRate: number;
      avgDaysToWin: number | null;
    };
    channels: Array<{
      label: string;
      deals: number;
      wonDeals: number;
      winRate: number;
    }>;
    owners: Array<{
      label: string;
      deals: number;
      wonDeals: number;
      openDeals: number;
      winRate: number;
    }>;
    pipelines: Array<{
      label: string;
      deals: number;
      wonDeals: number;
      lostDeals: number;
      openDeals: number;
      winRate: number;
    }>;
    openStages: Array<{
      label: string;
      pipelineLabel: string;
      count: number;
    }>;
    lostStages: Array<{
      label: string;
      pipelineLabel: string;
      count: number;
    }>;
    leadFunnel: Array<{
      label: string;
      pipelineLabel: string;
      deals: number;
      openDeals: number;
      wonDeals: number;
      lostDeals: number;
    }>;
    lostReasons: Array<{
      label: string;
      count: number;
    }>;
    monthly: Array<{
      monthKey: string;
      label: string;
      deals: number;
      wonDeals: number;
      lostDeals: number;
      openDeals: number;
    }>;
    recentDeals: Array<{
      id: number;
      title: string;
      status: string;
      ownerId: number | null;
      currency: string | null;
      addTime: string | null;
      wonTime: string | null;
      ownerName: string | null;
      canal: string;
      howArrived: string | null;
      lostReason: string | null;
      stageId: number | null;
      pipelineId: number | null;
      stageName: string | null;
      pipelineName: string | null;
    }>;
  } | null;
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function buildPeriodLabel(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${startDate.toLocaleDateString('pt-BR', options)} ate ${endDate.toLocaleDateString('pt-BR', options)}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR');
}

export default function PipedriveDirectPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [data, setData] = useState<PipedriveDirectPayload | null>(null);
  const [companyName, setCompanyName] = useState('Vai Pro Mundo');
  const [companyDomain, setCompanyDomain] = useState('vaipromundo');
  const [apiToken, setApiToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadData = async (signal?: AbortSignal) => {
    const params = new URLSearchParams({
      period: activePeriod === 'custom' ? '30' : activePeriod,
      start: dateRange.start,
      end: dateRange.end,
    });
    const response = await fetch(`/api/pipedrive-direct?${params.toString()}`, {
      cache: 'no-store',
      signal,
    });
    const payload = (await response.json()) as PipedriveDirectPayload;
    setData(payload);
    setCompanyName(payload.companyName || 'Vai Pro Mundo');
    setCompanyDomain(payload.companyDomain || 'vaipromundo');
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadData(controller.signal)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setMessage({ type: 'error', text: 'Nao foi possivel carregar a configuracao do Pipedrive' });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [activePeriod, dateRange.end, dateRange.start]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/pipedrive-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyDomain,
          apiToken,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: payload.error || 'Erro ao validar conexao com o Pipedrive' });
        return;
      }

      setApiToken('');
      setMessage({ type: 'success', text: `${payload.message}. ${payload.fieldsDetected} campos lidos.` });
      await loadData();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexao ao validar o Pipedrive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage({ type: 'info', text: 'Sincronizando operacao comercial do Pipedrive...' });

    try {
      const response = await fetch('/api/pipedrive-direct/sync', { method: 'POST' });
      const payload = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: payload.error || 'Erro ao sincronizar o Pipedrive' });
        return;
      }

      setMessage({ type: 'success', text: `${payload.message}. ${fmt(payload.totalDeals)} deals carregados.` });
      await loadData();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexao ao sincronizar o Pipedrive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/pipedrive-direct', { method: 'DELETE' });
    setApiToken('');
    setMessage({ type: 'info', text: 'Conexao com o Pipedrive removida' });
    await loadData();
  };

  const messageClass = message?.type === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : message?.type === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-blue-200 bg-blue-50 text-blue-700';

  const periodLabel = buildPeriodLabel(dateRange.start, dateRange.end);
  const summary = data?.data?.summary;
  const avgDaysLabel = summary?.avgDaysToWin !== null && summary?.avgDaysToWin !== undefined
    ? fmt(summary.avgDaysToWin, 'days')
    : '-';
  const preVendasLiviaFunnel = data?.data?.leadFunnel.filter((stage) =>
    stage.pipelineLabel.toLowerCase().includes('livia')
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Integracoes</p>
          <h1 className="text-2xl font-bold text-slate-900">Pipedrive Direto</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visao operacional do pipeline comercial. Nao substitui o fechamento real do Pipe Monde.
          </p>
        </div>
        <DateRangeFilter
          activePeriod={activePeriod}
          dateRange={dateRange}
          onPresetSelect={setPresetPeriod}
          onRangeChange={setCustomDateRange}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Key className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Conexao Pipedrive</h2>
            <p className="text-xs text-slate-400">Subdominio da conta + token da API</p>
          </div>
          {data?.configured && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle className="h-3.5 w-3.5" />
              Conectado
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nome da empresa</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Subdominio Pipedrive</label>
                <input
                  type="text"
                  value={companyDomain}
                  onChange={(event) => setCompanyDomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="vaipromundo"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-400">Ex.: `vaipromundo` para `vaipromundo.pipedrive.com`</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Token da API</label>
              <input
                type="password"
                value={apiToken}
                onChange={(event) => setApiToken(event.target.value)}
                placeholder="Cole o token do Pipedrive"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-400">O token e armazenado criptografado no servidor.</p>
            </div>

            {message && (
              <div className={`rounded-lg border px-3 py-3 text-xs font-medium ${messageClass}`}>{message.text}</div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || !companyDomain || !apiToken}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
              >
                {saving && <Loader className="h-4 w-4 animate-spin" />}
                {saving ? 'Validando...' : 'Salvar e Validar'}
              </button>

              {data?.configured && (
                <>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:bg-slate-300"
                  >
                    {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-red-200 hover:text-red-600"
                  >
                    <Unlink className="h-4 w-4" />
                    Desconectar
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Carregando...</span>
        </div>
      ) : !data?.data ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Database className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-slate-700">Nenhum dado sincronizado</h3>
          <p className="text-sm text-slate-500">
            Salve a conexao e clique em `Sincronizar Agora` para carregar os dados do Pipedrive nesta aba.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Periodo Analisado</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">{periodLabel}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Entradas no Pipedrive dentro do periodo selecionado.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ultima Sync</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {data.lastSync?.updatedAt
                      ? new Date(data.lastSync.updatedAt).toLocaleString('pt-BR')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Mapeamento</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Campo canal</span>
                  <span className="font-medium text-slate-800">{data.data.fields.channelFieldName || 'Nao encontrado'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Campo origem de apoio</span>
                  <span className="font-medium text-slate-800">{data.data.fields.howArrivedFieldName || 'Nao encontrado'}</span>
                </div>
                <p className="pt-1 text-xs text-slate-400">
                  A leitura operacional usa os campos detectados automaticamente no Pipedrive.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
            <KpiCard
              label="Oportunidades"
              value={fmt(summary?.opportunities || 0)}
              sub="criadas no periodo"
              tone="text-slate-900"
            />
            <KpiCard
              label="Ganhos"
              value={fmt(summary?.won || 0)}
              sub="status won"
              tone="text-emerald-700"
            />
            <KpiCard
              label="Perdidos"
              value={fmt(summary?.lost || 0)}
              sub="status lost"
              tone="text-rose-700"
            />
            <KpiCard
              label="Abertos"
              value={fmt(summary?.open || 0)}
              sub="ainda em andamento"
              tone="text-amber-700"
            />
            <KpiCard
              label="Taxa de Ganho"
              value={fmt(summary?.winRate || 0, 'pct')}
              sub="ganhos / oportunidades"
              tone="text-blue-700"
            />
            <KpiCard
              label="Tempo Medio ate Ganho"
              value={avgDaysLabel}
              sub="entre criacao e ganho"
              tone="text-violet-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <Target className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Canais de Entrada</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Canal</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Oportunidades</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Ganhos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.data.channels.map((channel) => (
                      <tr key={channel.label}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{channel.label}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(channel.deals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmt(channel.wonDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(channel.winRate, 'pct')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <Users className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Responsaveis</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Responsavel</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Oportunidades</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Ganhos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Abertos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.data.owners.map((owner) => (
                      <tr key={owner.label}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{owner.label}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(owner.deals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmt(owner.wonDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm text-amber-700">{fmt(owner.openDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(owner.winRate, 'pct')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.2fr_0.9fr]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <Target className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Ganhos por Funil</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Funil</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Entradas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Ganhos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.data.pipelines.map((pipeline) => (
                      <tr key={pipeline.label}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{pipeline.label}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(pipeline.deals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmt(pipeline.wonDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(pipeline.winRate, 'pct')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <Clock3 className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Funil de Leads</h2>
              </div>
              {data.data.leadFunnel.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500">Nenhum pipeline de leads encontrado no periodo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Etapa</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Funil</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Entradas</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Abertos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.data.leadFunnel.map((stage) => (
                        <tr key={`${stage.pipelineLabel}-${stage.label}`}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{stage.label}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{stage.pipelineLabel}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(stage.deals)}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700">{fmt(stage.openDeals)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <AlertTriangle className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Perdidos por Etapa</h2>
              </div>
              {data.data.lostStages.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500">Nenhuma perda encontrada no periodo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Etapa</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Funil</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Perdidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.data.lostStages.map((stage) => (
                        <tr key={`${stage.pipelineLabel}-${stage.label}`}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{stage.label}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{stage.pipelineLabel}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-rose-700">{fmt(stage.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <Clock3 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Funil Pre Vendas - Livia</h2>
            </div>
            {preVendasLiviaFunnel.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">Nenhum deal encontrado nesse funil no periodo.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Etapa</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Entradas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Abertos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Ganhos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Perdidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {preVendasLiviaFunnel.map((stage) => (
                      <tr key={`${stage.pipelineLabel}-${stage.label}`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{stage.label}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(stage.deals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700">{fmt(stage.openDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmt(stage.wonDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-rose-700">{fmt(stage.lostDeals)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Evolucao Mensal</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mes</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Entradas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Ganhos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Perdidos</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Abertos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.data.monthly.map((month) => (
                      <tr key={month.monthKey}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{month.label}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(month.deals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmt(month.wonDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-rose-700">{fmt(month.lostDeals)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700">{fmt(month.openDeals)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.4fr]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <AlertTriangle className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Top Motivos de Perda</h2>
              </div>
              {data.data.lostReasons.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500">Nenhum motivo de perda encontrado no periodo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Motivo</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Perdas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.data.lostReasons.map((reason) => (
                        <tr key={reason.label}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{reason.label}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-rose-700">{fmt(reason.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <Clock3 className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Deals Recentes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Deal</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Canal</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Responsavel</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Funil</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Etapa</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Criado em</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Ganho em</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Motivo perda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.data.recentDeals.map((deal) => (
                      <tr key={deal.id}>
                        <td className="px-3 py-3">
                          <p className="text-sm font-medium text-slate-800">{deal.title}</p>
                          <p className="text-xs text-slate-400">ID {deal.id}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">{deal.canal || '-'}</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{deal.ownerName || 'Sem responsavel'}</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{deal.pipelineName || 'Sem funil'}</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{deal.stageName || 'Sem etapa'}</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{deal.status}</td>
                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(deal.addTime)}</td>
                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(deal.wonTime)}</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{deal.lostReason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
            Esta aba usa o Pipedrive direto para operacao comercial. Receita final e fechamento consolidado continuam sendo mais confiaveis no Pipe Monde.
          </div>
        </>
      )}
    </div>
  );
}
