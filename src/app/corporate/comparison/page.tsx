'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/corporate/MetricCard';

interface PeriodMetrics {
  revenue: number;
  sales: number;
  avgTicket: number;
}

interface ComparisonData {
  p1: PeriodMetrics;
  p2: PeriodMetrics;
  growth: number;
}

export default function ComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/corporate/comparison?period=30', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => {
        if (e instanceof Error && e.name !== 'AbortError') {
          const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
          setError(`Falha ao carregar dados: ${errorMsg}`);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) return <div className="text-center py-12" role="status" aria-live="polite" aria-label="Carregando dados de comparação">Carregando...</div>;

  if (error) return <div className="text-center py-12 text-red-600" role="alert" aria-live="assertive">{error}</div>;

  if (!data) return <div className="text-center py-12 text-red-600" role="alert" aria-live="assertive">Sem dados disponíveis</div>;

  const { p1, p2, growth } = data;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Comparação de Períodos</h1>

      {/* Comparison KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Receita P1 (Últimos 30 dias)" value={p1.revenue} format="currency" />
        <MetricCard label="Receita P2 (30 dias anteriores)" value={p2.revenue} format="currency" />
        <MetricCard label="Crescimento" value={growth} format="percent" change={growth} />
      </div>

      {/* Period Details */}
      <div className="grid grid-cols-2 gap-6">
        {/* Period 1 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Período 1 (Últimos 30 dias)</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receita</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {p1.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Quantidade de Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{p1.sales}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {p1.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Period 2 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Período 2 (30 dias anteriores)</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receita</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {p2.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Quantidade de Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{p2.sales}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {p2.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
