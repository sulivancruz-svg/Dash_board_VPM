'use client';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/corporate/DataTable';
import { BarChartCorp } from '@/components/corporate/BarChartCorp';

interface SellerData extends Record<string, unknown> {
  id: string;
  name: string;
  revenue: number;
  sales: number;
  avgTicket: number;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<SellerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/corporate/sellers?limit=50', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setSellers(d.sellers); setLoading(false); })
      .catch(e => {
        if (e instanceof Error && e.name !== 'AbortError') {
          const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
          setError(`Falha ao carregar dados: ${errorMsg}`);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) return <div className="text-center py-12" role="status" aria-live="polite" aria-label="Carregando dados de vendedores">Carregando...</div>;

  if (error) return <div className="text-center py-12 text-red-600" role="alert">{error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Performance por Vendedor</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Vendedores</h2>
        <BarChartCorp
          data={sellers.slice(0, 10).map((s, idx) => ({ id: s.id || `seller-${idx}`, name: s.name, revenue: s.revenue }))}
          dataKey="revenue"
          height={400}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Vendedor' },
            { key: 'revenue', label: 'Receita', format: 'currency' },
            { key: 'sales', label: 'Vendas' },
            { key: 'avgTicket', label: 'Ticket Médio', format: 'currency' },
          ]}
          data={sellers}
        />
      </div>
    </div>
  );
}
