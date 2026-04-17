'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader, Upload } from 'lucide-react';

import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';

function fmt(value: number, type: 'currency' | 'number' | 'pct' = 'number'): string {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (type === 'pct') {
    return `${value.toFixed(1)}%`;
  }

  return new Intl.NumberFormat('pt-BR').format(value);
}

const EMPTY_VALUE = '-';

interface CohortMonth {
  monthKey: string;
  label: string;
  opportunities: number;
  sameMonthSales: number;
  sameMonthRevenue: number;
  totalSalesAnyMonth: number;
  totalRevenueAnyMonth: number;
  openDeals: number;
  investment: number;
  sameMonthCac: number | null;
  sameMonthConversionRate: number;
}

interface CohortMatrixRow {
  entryMonthKey: string;
  label: string;
  opportunities: number;
  soldAnyMonth: number;
  unsold: number;
  cells: Array<{
    monthKey: string;
    sales: number;
    revenue: number;
  }>;
}

interface CohortsPayload {
  hasData: boolean;
  periodLabel: string;
  investmentSources: {
    metaConnected: boolean;
    googleConnected: boolean;
  };
  summary: {
    entryDeals: number;
    sameMonthSales: number;
    sameMonthRevenue: number;
    totalInvestment: number;
    trackedEntryMonths: number;
    sameMonthCac: number | null;
    sameMonthConversionRate: number;
  } | null;
  monthly: CohortMonth[];
  matrix: {
    saleMonths: Array<{ monthKey: string; label: string }>;
    rows: CohortMatrixRow[];
  };
}

function KpiCard({
  label,
  value,
  sub,
  tone = 'text-slate-900',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function CohortsPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();
  const [data, setData] = useState<CohortsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      period: activePeriod === 'custom' ? '30' : activePeriod,
      start: dateRange.start,
      end: dateRange.end,
    });
    const controller = new AbortController();

    setLoading(true);
    fetch(`/api/data/cohorts?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Analise de Coorte</p>
          <h1 className="text-2xl font-bold text-slate-900">CAC do Mes & Coortes</h1>
          {data?.periodLabel && <p className="mt-0.5 text-xs text-slate-400">Entradas analisadas: {data.periodLabel}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      ) : !data?.hasData || !data.summary ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Upload className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-slate-700">Nenhuma coorte disponivel</h3>
          <p className="mb-5 text-sm text-slate-500">
            Importe a planilha Pipe Monde com `Consolidado_Pipe` e `Consolidado_Monde` para analisar entrada e fechamento.
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
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <KpiCard
              label="Entradas no Periodo"
              value={fmt(data.summary.entryDeals)}
              sub={`${fmt(data.summary.trackedEntryMonths)} meses de entrada`}
              tone="text-slate-900"
            />
            <KpiCard
              label="Fechou no Mesmo Mes"
              value={fmt(data.summary.sameMonthSales)}
              sub={fmt(data.summary.sameMonthConversionRate, 'pct')}
              tone="text-emerald-700"
            />
            <KpiCard
              label="Receita Mesmo Mes"
              value={fmt(data.summary.sameMonthRevenue, 'currency')}
              sub="so vendas no mesmo mes da entrada"
              tone="text-teal-700"
            />
            <KpiCard
              label="Investimento do Periodo"
              value={fmt(data.summary.totalInvestment, 'currency')}
              sub="Meta + Google por mes de entrada"
              tone="text-blue-700"
            />
            <KpiCard
              label="CAC Mesmo Mes"
              value={data.summary.sameMonthCac !== null ? fmt(data.summary.sameMonthCac, 'currency') : EMPTY_VALUE}
              sub="investimento / fechamentos no mesmo mes"
              tone="text-violet-700"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">CAC do Mes Fechado no Mesmo Mes</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Cada linha usa o mes de entrada no Pipe e verifica quantos deals fecharam no mesmo mes no Monde.
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Google {data.investmentSources.googleConnected ? 'incluido' : 'nao disponivel'}</p>
                <p>Meta {data.investmentSources.metaConnected ? 'incluido' : 'nao conectado'}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mes de Entrada</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Oportunidades</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Fechou no Mesmo Mes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Conv. Mesmo Mes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Receita Mesmo Mes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Investimento</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">CAC Mesmo Mes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Fechou Depois</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Ainda Sem Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.monthly.map((row) => (
                    <tr key={row.monthKey} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.label}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(row.opportunities)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmt(row.sameMonthSales)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(row.sameMonthConversionRate, 'pct')}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-teal-700">{fmt(row.sameMonthRevenue, 'currency')}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(row.investment, 'currency')}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-violet-700">
                        {row.sameMonthCac !== null ? fmt(row.sameMonthCac, 'currency') : EMPTY_VALUE}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(Math.max(row.totalSalesAnyMonth - row.sameMonthSales, 0))}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(row.openDeals)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Coorte de Entrada por Mes</h2>
              <p className="mt-1 text-xs text-slate-400">
                Linhas mostram o mes de entrada no Pipe. Colunas mostram em qual mes esses deals fecharam no Monde.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Entrada
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Oportunidades</th>
                    {data.matrix.saleMonths.map((month) => (
                      <th
                        key={month.monthKey}
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {month.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Sem Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.matrix.rows.map((row) => (
                    <tr key={row.entryMonthKey} className="transition-colors hover:bg-slate-50">
                      <td className="sticky left-0 bg-white px-4 py-3 text-sm font-semibold text-slate-800">{row.label}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(row.opportunities)}</td>
                      {row.cells.map((cell) => (
                        <td key={`${row.entryMonthKey}-${cell.monthKey}`} className="px-4 py-3 text-center">
                          {cell.sales > 0 ? (
                            <div>
                              <p className="text-sm font-semibold text-emerald-700">{fmt(cell.sales)}</p>
                              <p className="text-[11px] text-slate-400">{fmt(cell.revenue, 'currency')}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-300">{EMPTY_VALUE}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(row.unsold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
