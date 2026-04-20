'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChartComponent } from '@/components/BarChartComponent';
import { KpiCard } from '@/components/KpiCard';
import { DateRangePicker } from '@/components/DateRangePicker';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { useSharedDateRange } from '@/lib/use-shared-date-range';
import { ComparisonData } from '@/types';

export default function ComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startDate, endDate, setDateRange } = useSharedDateRange();

  const fetchData = async (start: Date, end: Date) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
      const response = await fetch(`/api/comparison?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.details || result?.error || 'Falha ao carregar dados');
      }

      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate]);

  const charts = useMemo(() => {
    if (!data) return null;

    return {
      sales: [
        { name: 'Anterior', total: data.previousPeriod.totalSales },
        { name: 'Atual', total: data.currentPeriod.totalSales },
      ],
      revenue: [
        { name: 'Anterior', total: data.previousPeriod.totalRevenue },
        { name: 'Atual', total: data.currentPeriod.totalRevenue },
      ],
      ticket: [
        { name: 'Anterior', total: data.previousPeriod.avgTicket },
        { name: 'Atual', total: data.currentPeriod.avgTicket },
      ],
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Evolução de período</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Comparação</h1>
      </div>

      <DateRangePicker onDateChange={setDateRange} defaultStartDate={startDate} defaultEndDate={endDate} />

      {loading && <div className="text-center py-8 text-cyan-100/70">Carregando dados...</div>}
      {error && <div className="rounded border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{error}</div>}

      {data && charts && !loading && !error && (
        <>
          <div className="rounded border border-cyan-400/15 bg-[#0B2440] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
            <h2 className="text-xl font-semibold text-white">Atual vs anterior</h2>
            <p className="mt-1 text-sm text-cyan-100/60">
              Compara o período selecionado com o intervalo imediatamente anterior, usando a mesma quantidade de dias.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded border border-slate-500/30 bg-slate-950/25 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Anterior</p>
                <p className="mt-2 text-2xl font-bold text-white">{data.previousPeriodRange?.label || 'Não informado'}</p>
              </div>
              <div className="rounded border border-emerald-300/30 bg-emerald-400/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Atual</p>
                <p className="mt-2 text-2xl font-bold text-white">{data.currentPeriodRange?.label || data.period}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <KpiCard
              title="Vendas"
              value={formatPercentage(data.growth.salesGrowth)}
              subtitle={`${data.previousPeriod.totalSales} anterior | ${data.currentPeriod.totalSales} atual`}
              trend={{ value: Math.abs(data.growth.salesGrowth), direction: data.growth.salesGrowth >= 0 ? 'up' : 'down' }}
            />
            <KpiCard
              title="Receita"
              value={formatPercentage(data.growth.revenueGrowth)}
              subtitle={`${formatCurrency(data.previousPeriod.totalRevenue)} anterior | ${formatCurrency(data.currentPeriod.totalRevenue)} atual`}
              trend={{ value: Math.abs(data.growth.revenueGrowth), direction: data.growth.revenueGrowth >= 0 ? 'up' : 'down' }}
            />
            <KpiCard
              title="Ticket Médio"
              value={formatPercentage(data.growth.avgTicketGrowth)}
              subtitle={`${formatCurrency(data.previousPeriod.avgTicket)} anterior | ${formatCurrency(data.currentPeriod.avgTicket)} atual`}
              trend={{ value: Math.abs(data.growth.avgTicketGrowth), direction: data.growth.avgTicketGrowth >= 0 ? 'up' : 'down' }}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <BarChartComponent
              data={charts.sales}
              title="Vendas"
              bars={[{ key: 'total', label: 'Total de vendas', color: '#38BDF8' }]}
              height={320}
            />
            <BarChartComponent
              data={charts.revenue}
              title="Receita"
              bars={[{ key: 'total', label: 'Receita', color: '#10B981' }]}
              formatYAxis="currency"
              height={320}
            />
            <BarChartComponent
              data={charts.ticket}
              title="Ticket Médio"
              bars={[{ key: 'total', label: 'Ticket médio', color: '#FBBF24' }]}
              formatYAxis="currency"
              height={320}
            />
          </div>
        </>
      )}
    </div>
  );
}
