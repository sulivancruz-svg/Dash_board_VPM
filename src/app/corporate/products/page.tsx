'use client';
import { useEffect, useState } from 'react';
import { PieChartCorp } from '@/components/corporate/PieChartCorp';
import { DataTable } from '@/components/corporate/DataTable';

interface ProductData {
  id: string;
  name: string;
  revenue: number;
  count: number;
  pct: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/corporate/products', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setProducts(d.products); setLoading(false); })
      .catch(e => {
        if (e instanceof Error && e.name !== 'AbortError') {
          const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
          setError(`Falha ao carregar dados: ${errorMsg}`);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) return <div className="text-center py-12" role="status" aria-live="polite" aria-label="Carregando dados de produtos">Carregando...</div>;

  if (error) return <div className="text-center py-12 text-red-600" role="alert">{error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Breakdown de Produtos</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição</h2>
        <PieChartCorp data={products.map((p, idx) => ({ id: p.id || `prod-${idx}`, name: p.name, value: p.revenue }))} height={400} />
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
          data={products.map((p, idx) => ({ ...p, id: p.id || `prod-${idx}`, pct: `${p.pct.toFixed(1)}%` }))}
        />
      </div>
    </div>
  );
}
