'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DateRangePicker';
import { formatCurrency, formatDate } from '@/lib/format';
import { ProductsData } from '@/types';

export default function ProductsPage() {
  const [data, setData] = useState<ProductsData[]>([]);
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
      const response = await fetch(`/api/products?${params}`);
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
    { key: 'name' as const, label: 'Nome do Produto', width: '30%' },
    {
      key: 'totalSales' as const,
      label: 'Total de Vendas',
      render: (value: number) => value,
    },
    {
      key: 'totalRevenue' as const,
      label: 'Receita Total',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'avgPrice' as const,
      label: 'Preço Médio',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'unitsSold' as const,
      label: 'Unidades Vendidas',
      render: (value: number) => value,
    },
    {
      key: 'lastSaleDate' as const,
      label: 'Última Venda',
      render: (value: Date) => formatDate(value),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>

      <DateRangePicker onDateChange={handleDateChange} defaultStartDate={startDate} defaultEndDate={endDate} />

      {loading && <div className="text-center py-8 text-gray-500">Carregando dados...</div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      {!loading && <DataTable data={data} columns={columns} title={`Total: ${data.length} produtos`} />}
    </div>
  );
}
