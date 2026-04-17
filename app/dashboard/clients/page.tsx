'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DateRangePicker';
import { formatCurrency, formatDate } from '@/lib/format';
import { ClientsData } from '@/types';

export default function ClientsPage() {
  const [data, setData] = useState<ClientsData[]>([]);
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
      const response = await fetch(`/api/clients?${params}`);
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

  const columns = [
    { key: 'name' as const, label: 'Nome do Cliente', width: '25%' },
    {
      key: 'totalPurchases' as const,
      label: 'Total de Compras',
      render: (value: number) => value,
    },
    {
      key: 'totalSpent' as const,
      label: 'Gasto Total',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'avgTicket' as const,
      label: 'Ticket Médio',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'productsCount' as const,
      label: 'Produtos Diferentes',
      render: (value: number) => value,
    },
    {
      key: 'lastPurchaseDate' as const,
      label: 'Última Compra',
      render: (value: Date) => formatDate(value),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>

      <DateRangePicker onDateChange={handleDateChange} defaultStartDate={startDate} defaultEndDate={endDate} />

      {loading && <div className="text-center py-8 text-gray-500">Carregando dados...</div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      {!loading && <DataTable data={data} columns={columns} title={`Total: ${data.length} clientes`} />}
    </div>
  );
}
