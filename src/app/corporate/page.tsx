'use client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/corporate/MetricCard';
import { LineChartCorp } from '@/components/corporate/LineChartCorp';
import { BarChartCorp } from '@/components/corporate/BarChartCorp';
import { PieChartCorp } from '@/components/corporate/PieChartCorp';
import { DataTable } from '@/components/corporate/DataTable';
import { SyncButton } from '@/components/corporate/SyncButton';

interface OverviewData {
  metrics: {
    totalSales: number;
    totalRevenue: number;
    totalBilling: number;
    avgTicket: number;
    revenueGrowth: number;
  };
  monthlyTrend: Array<{ month: string; revenue: number; billing: number }>;
  topSellers: Array<{ name: string; revenue: number; sales: number; avgTicket: number }>;
  topClients: Array<{ id: string; name: string; revenue: number; sales: number; avgTicket: number }>;
  products: Array<{ name: string; revenue: number; count: number; pct: number }>;
  profiles: Array<{ profile: string; revenue: number }>;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        const res = await fetch('/api/corporate/overview', {
          signal: abortController.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          setError(`Falha ao carregar dados: ${errorMsg}`);
          console.error('Failed to load overview:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => abortController.abort();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12" role="status" aria-live="polite" aria-label="Carregando dados">
        Carregando...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-red-600" role="alert" aria-live="assertive">
        {error || 'Erro ao carregar dados'}
      </div>
    );
  }

  const { metrics, monthlyTrend, topSellers, topClients, products, profiles } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" id="page-title">
            Visão Geral Corporativa
          </h1>
          <p className="text-gray-600 mt-2">Análise de vendas em tempo real</p>
        </div>
        <SyncButton />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total de Vendas" value={metrics.totalSales} format="number" />
        <MetricCard label="Receita Total" value={metrics.totalRevenue} format="currency" />
        <MetricCard label="Faturamento" value={metrics.totalBilling} format="currency" />
        <MetricCard label="Ticket Médio" value={metrics.avgTicket} format="currency" change={metrics.revenueGrowth} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendência Mensal</h2>
          <LineChartCorp
            data={monthlyTrend}
            lines={[
              { dataKey: 'revenue', stroke: '#3b82f6', name: 'Receita' },
              { dataKey: 'billing', stroke: '#10b981', name: 'Faturamento' },
            ]}
            height={300}
          />
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 8 Vendedores</h2>
          <BarChartCorp
            data={topSellers.slice(0, 8).map(s => ({ name: s.name, revenue: s.revenue }))}
            dataKey="revenue"
            height={300}
          />
        </div>
      </div>

      {/* Product & Profile Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Breakdown de Produtos</h2>
          <PieChartCorp data={products.map(p => ({ name: p.name, value: p.revenue }))} height={300} />
        </div>

        {/* Profiles */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Perfil de Antecedência</h2>
          <div className="space-y-3">
            {profiles.map((p, idx) => (
              <div key={`${p.profile}-${idx}`} className="flex justify-between items-center">
                <span className="text-gray-700">{p.profile}</span>
                <span className="font-semibold">
                  R$ {p.revenue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Clients Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 15 Clientes</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Cliente' },
            { key: 'revenue', label: 'Receita', format: 'currency' },
            { key: 'sales', label: 'Vendas' },
            { key: 'avgTicket', label: 'Ticket Médio', format: 'currency' },
          ]}
          data={topClients}
        />
      </div>
    </div>
  );
}
