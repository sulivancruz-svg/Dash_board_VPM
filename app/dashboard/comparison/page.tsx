'use client';

import React, { useState, useEffect } from 'react';
import { KpiCard } from '@/components/KpiCard';
import { DateRangePicker } from '@/components/DateRangePicker';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { ComparisonData } from '@/types';

export default function ComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
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
      const response = await fetch(`/api/comparison?${params}`);
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
      <h1 className="text-3xl font-bold text-gray-900">Comparação de Períodos</h1>

      <DateRangePicker onDateChange={handleDateChange} defaultStartDate={startDate} defaultEndDate={endDate} />

      {loading && <div className="text-center py-8 text-gray-500">Carregando dados...</div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      {data && (
        <>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Período Analisado: {data.period}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Período Anterior</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data.previousPeriod.totalSales} vendas</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Período Atual</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data.currentPeriod.totalSales} vendas</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard
              title="Crescimento de Vendas"
              value={formatPercentage(data.growth.salesGrowth)}
              subtitle={`De ${data.previousPeriod.totalSales} para ${data.currentPeriod.totalSales}`}
              trend={{
                value: Math.abs(data.growth.salesGrowth),
                direction: data.growth.salesGrowth >= 0 ? 'up' : 'down',
              }}
            />
            <KpiCard
              title="Crescimento de Receita"
              value={formatPercentage(data.growth.revenueGrowth)}
              subtitle={`De ${formatCurrency(data.previousPeriod.totalRevenue)} para ${formatCurrency(
                data.currentPeriod.totalRevenue
              )}`}
              trend={{
                value: Math.abs(data.growth.revenueGrowth),
                direction: data.growth.revenueGrowth >= 0 ? 'up' : 'down',
              }}
            />
            <KpiCard
              title="Crescimento do Ticket Médio"
              value={formatPercentage(data.growth.avgTicketGrowth)}
              subtitle={`De ${formatCurrency(data.previousPeriod.avgTicket)} para ${formatCurrency(
                data.currentPeriod.avgTicket
              )}`}
              trend={{
                value: Math.abs(data.growth.avgTicketGrowth),
                direction: data.growth.avgTicketGrowth >= 0 ? 'up' : 'down',
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Período Anterior</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendas:</span>
                  <span className="font-medium">{data.previousPeriod.totalSales}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Receita:</span>
                  <span className="font-medium">{formatCurrency(data.previousPeriod.totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket Médio:</span>
                  <span className="font-medium">{formatCurrency(data.previousPeriod.avgTicket)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Período Atual</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendas:</span>
                  <span className="font-medium">{data.currentPeriod.totalSales}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Receita:</span>
                  <span className="font-medium">{formatCurrency(data.currentPeriod.totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket Médio:</span>
                  <span className="font-medium">{formatCurrency(data.currentPeriod.avgTicket)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
