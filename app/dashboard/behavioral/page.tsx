'use client';

import React, { useState, useEffect } from 'react';
import { LineChartComponent } from '@/components/LineChartComponent';
import { DateRangePicker } from '@/components/DateRangePicker';
import { formatCurrency } from '@/lib/format';
import { BehavioralData } from '@/types';

export default function BehavioralPage() {
  const [data, setData] = useState<BehavioralData[]>([]);
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
      const response = await fetch(`/api/behavioral?${params}`);
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

  // Transform data for charts
  const chartData = data.map((d) => ({
    name: `${d.hour.toString().padStart(2, '0')}:00`,
    'Número de Vendas': d.salesCount,
    'Receita (R$)': d.revenue,
    'Ticket Médio': d.avgTicket,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Análise Comportamental</h1>

      <DateRangePicker onDateChange={handleDateChange} defaultStartDate={startDate} defaultEndDate={endDate} />

      {loading && <div className="text-center py-8 text-gray-500">Carregando dados...</div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      {!loading && data.length > 0 && (
        <>
          <LineChartComponent
            data={chartData}
            title="Vendas por Hora do Dia"
            lines={[
              { key: 'Número de Vendas', label: 'Número de Vendas', color: '#3B82F6' },
              { key: 'Receita (R$)', label: 'Receita (R$)', color: '#10B981' },
            ]}
            height={400}
          />

          <LineChartComponent
            data={chartData}
            title="Ticket Médio por Hora"
            lines={[{ key: 'Ticket Médio', label: 'Ticket Médio', color: '#F59E0B' }]}
            height={300}
            formatYAxis="currency"
          />
        </>
      )}
    </div>
  );
}
