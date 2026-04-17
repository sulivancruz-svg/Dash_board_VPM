'use client';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/corporate/DataTable';
import { BarChartCorp } from '@/components/corporate/BarChartCorp';

export default function SellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/sellers?limit=50')
      .then(r => r.json())
      .then(d => { setSellers(d.sellers); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Performance por Vendedor</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Vendedores</h2>
        <BarChartCorp
          data={sellers.slice(0, 10).map(s => ({ name: s.name, revenue: s.revenue }))}
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
