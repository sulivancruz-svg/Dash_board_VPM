'use client';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/corporate/DataTable';

interface FilterState {
  seller?: string;
  client?: string;
  product?: string;
  startDate?: string;
  endDate?: string;
}

interface RawSaleData extends Record<string, unknown> {
  saleNumber: string;
  saleDate: string;
  seller: string;
  client: string;
  product: string;
  revenue: number;
  id: string;
}

interface RawDataResponse {
  data: RawSaleData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function FilterPanel({
  onFiltersChange,
}: {
  onFiltersChange: (filters: FilterState) => void;
}) {
  const [filters, setFilters] = useState<FilterState>({});

  const handleChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="seller" className="block text-sm font-medium text-gray-700 mb-2">
            Vendedor
          </label>
          <input
            id="seller"
            type="text"
            placeholder="Nome do vendedor"
            value={filters.seller || ''}
            onChange={(e) => handleChange('seller', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-2">
            Cliente
          </label>
          <input
            id="client"
            type="text"
            placeholder="Nome do cliente"
            value={filters.client || ''}
            onChange={(e) => handleChange('client', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-2">
            Produto
          </label>
          <input
            id="product"
            type="text"
            placeholder="Nome do produto"
            value={filters.product || ''}
            onChange={(e) => handleChange('product', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
            Data Inicial
          </label>
          <input
            id="startDate"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
            Data Final
          </label>
          <input
            id="endDate"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

export default function RawDataPage() {
  const [data, setData] = useState<RawSaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({});
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', '50');
    if (filters.seller) params.append('seller', filters.seller);
    if (filters.client) params.append('client', filters.client);
    if (filters.product) params.append('product', filters.product);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    fetch(`/api/corporate/raw?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json())
      .then((d: RawDataResponse) => {
        setData(d.data);
        setTotal(d.total);
        setPages(d.pages);
        setLoading(false);
      })
      .catch(e => {
        if (e instanceof Error && e.name !== 'AbortError') {
          const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
          setError(`Falha ao carregar dados: ${errorMsg}`);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, [page, filters]);

  if (loading) return <div className="text-center py-12" role="status" aria-live="polite" aria-label="Carregando dados brutos">Carregando...</div>;

  if (error) return <div className="text-center py-12 text-red-600" role="alert" aria-live="assertive">{error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Dados Brutos</h1>

      <FilterPanel onFiltersChange={(newFilters) => { setFilters(newFilters); setPage(1); }} />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Vendas</h2>
          <p className="text-sm text-gray-600">
            Total de registros: {total} | Página {page} de {pages}
          </p>
        </div>

        <DataTable
          columns={[
            { key: 'saleNumber', label: 'Número da Venda' },
            { key: 'saleDate', label: 'Data', format: 'date' },
            { key: 'seller', label: 'Vendedor' },
            { key: 'client', label: 'Cliente' },
            { key: 'product', label: 'Produto' },
            { key: 'revenue', label: 'Receita', format: 'currency' },
          ]}
          data={data}
          currentPage={page}
          totalPages={pages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
