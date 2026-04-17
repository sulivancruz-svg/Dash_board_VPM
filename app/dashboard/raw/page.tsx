'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DateRangePicker';
import { formatCurrency, formatDate } from '@/lib/format';
import { RawSaleData } from '@/types';

export default function RawPage() {
  const [data, setData] = useState<RawSaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, pages: 0 });
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  const fetchData = async (start: Date, end: Date, page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        page: page.toString(),
        pageSize: '50',
      });
      const response = await fetch(`/api/raw?${params}`);
      if (!response.ok) throw new Error('Falha ao carregar dados');
      const result = await response.json();
      setData(result.data);
      setPagination(result.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(startDate, endDate, pagination.page);
  }, [startDate, endDate]);

  const handleDateChange = (newStart: Date, newEnd: Date) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    setPagination({ ...pagination, page: 1 });
  };

  const columns = [
    { key: 'date' as const, label: 'Data', render: (value: Date) => formatDate(value) },
    { key: 'sellerName' as const, label: 'Vendedor', width: '20%' },
    { key: 'client' as const, label: 'Cliente', width: '20%' },
    { key: 'product' as const, label: 'Produto', width: '20%' },
    { key: 'amount' as const, label: 'Valor', render: (value: number) => formatCurrency(value) },
    { key: 'commission' as const, label: 'Comissão', render: (value: number) => formatCurrency(value) },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value === 'COMPLETED'
              ? 'bg-green-100 text-green-800'
              : value === 'CANCELLED'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dados Brutos de Vendas</h1>

      <DateRangePicker onDateChange={handleDateChange} defaultStartDate={startDate} defaultEndDate={endDate} />

      {loading && <div className="text-center py-8 text-gray-500">Carregando dados...</div>}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      {!loading && (
        <>
          <DataTable
            data={data}
            columns={columns}
            title={`Total: ${pagination.total} vendas (Página ${pagination.page} de ${pagination.pages})`}
          />

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  if (pagination.page > 1) {
                    fetchData(startDate, endDate, pagination.page - 1);
                    setPagination({ ...pagination, page: pagination.page - 1 });
                  }
                }}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-md transition-colors"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-gray-900">{pagination.page}</span>
              <button
                onClick={() => {
                  if (pagination.page < pagination.pages) {
                    fetchData(startDate, endDate, pagination.page + 1);
                    setPagination({ ...pagination, page: pagination.page + 1 });
                  }
                }}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-md transition-colors"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
