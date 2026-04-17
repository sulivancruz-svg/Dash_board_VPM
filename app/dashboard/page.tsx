'use client';

import React, { useState, useEffect } from 'react';
import { KpiCard } from '@/components/KpiCard';
import { LineChartComponent } from '@/components/LineChartComponent';
import { DateRangePicker } from '@/components/DateRangePicker';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/format';
import { OverviewData } from '@/types';

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  const fetchData = async (start: Date, end: Date) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
      const response = await fetch(`/api/overview?${params}`);
      if (!response.ok) throw new Error('Falha ao carregar dados');
      const result = await response.json();
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

  const handleDateChange = (newStart: Date, newEnd: Date) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>

      <DateRangePicker onDateChange={handleDateChange} defaultStartDate={startDate} defaultEndDate={endDate} />

      {loading && <div className="text-center py-8 text-gray-500">Carregando dados...</div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KpiCard
              title="Total de Vendas"
              value={data.totalSales}
              subtitle="Quantidade de transações"
              trend={{ value: Math.abs(data.growthRate), direction: data.growthRate >= 0 ? 'up' : 'down' }}
            />
            <KpiCard
              title="Receita Total"
              value={formatCurrency(data.totalRevenue)}
              subtitle={`Média: ${formatCurrency(data.avgTicket)}`}
            />
            <KpiCard
              title="Clientes Únicos"
              value={data.totalClients}
              subtitle={`${data.totalProducts} produtos`}
            />
            <KpiCard
              title="Melhor Vendedor"
              value={data.topSellerName}
              subtitle={formatCurrency(data.topSellerAmount)}
            />
            <KpiCard
              title="Melhor Cliente"
              value={data.topClientName}
              subtitle={formatCurrency(data.topClientAmount)}
            />
            <KpiCard
              title="Melhor Produto"
              value={data.topProductName}
              subtitle={formatCurrency(data.topProductAmount)}
            />
          </div>

          <LineChartComponent
            data={data.salesTrend}
            title="Tendência de Vendas e Receita"
            lines={[
              { key: 'sales', label: 'Quantidade de Vendas', color: '#3B82F6' },
              { key: 'revenue', label: 'Receita (R$)', color: '#10B981' },
            ]}
            formatYAxis="currency"
          />
        </>
      )}
    </div>
  );
}
