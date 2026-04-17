'use client';
import { useEffect, useState } from 'react';
import { PieChartCorp } from '@/components/corporate/PieChartCorp';
import { DataTable } from '@/components/corporate/DataTable';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/products')
      .then(r => r.json())
      .then(d => { setProducts(d.products); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Breakdown de Produtos</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição</h2>
        <PieChartCorp data={products.map(p => ({ name: p.name, value: p.revenue }))} height={400} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Produto' },
            { key: 'revenue', label: 'Receita', format: 'currency' },
            { key: 'count', label: 'Quantidade' },
            { key: 'pct', label: 'Participação', format: 'text' },
          ]}
          data={products.map(p => ({ ...p, pct: `${p.pct.toFixed(1)}%` }))}
        />
      </div>
    </div>
  );
}
