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
      {/* Header with gradient text */}
      <div className="flex justify-between items-start gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" id="page-title">
            Visão Geral Corporativa
          </h1>
          <p className="text-slate-400 mt-3 text-lg">Análise de vendas em tempo real • Sincronizado automaticamente</p>
        </div>
        <SyncButton />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de Vendas" value={metrics.totalSales} format="number" />
        <MetricCard label="Receita Total" value={metrics.totalRevenue} format="currency" />
        <MetricCard label="Faturamento" value={metrics.totalBilling} format="currency" />
        <MetricCard label="Ticket Médio" value={metrics.avgTicket} format="currency" change={metrics.revenueGrowth} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50" />
          <h2 className="text-lg font-semibold text-slate-200 mb-5">Tendência Mensal</h2>
          <LineChartCorp
            data={monthlyTrend}
            lines={[
              { dataKey: 'revenue', stroke: '#00d9ff', name: 'Receita' },
              { dataKey: 'billing', stroke: '#8b5cf6', name: 'Faturamento' },
            ]}
            height={300}
          />
        </div>

        {/* Top Sellers Chart */}
        <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-cyan-500 via-purple-500 to-pink-500 opacity-50" />
          <h2 className="text-lg font-semibold text-slate-200 mb-5">Top 8 Vendedores</h2>
          <BarChartCorp
            data={topSellers.slice(0, 8).map(s => ({ name: s.name, revenue: s.revenue }))}
            dataKey="revenue"
            height={300}
          />
        </div>
      </div>

      {/* Product & Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products Distribution */}
        <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500 opacity-50" />
          <h2 className="text-lg font-semibold text-slate-200 mb-5">Breakdown de Produtos</h2>
          <PieChartCorp data={products.map(p => ({ name: p.name, value: p.revenue }))} height={300} />
        </div>

        {/* Booking Profiles */}
        <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-pink-500 via-purple-500 to-cyan-500 opacity-50" />
          <h2 className="text-lg font-semibold text-slate-200 mb-5">Perfil de Antecedência</h2>
          <div className="space-y-4">
            {profiles.map((p, idx) => (
              <div key={`${p.profile}-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/20 border border-slate-600/30 hover:border-slate-600/50 transition-colors duration-200">
                <span className="text-slate-300 font-medium">{p.profile}</span>
                <span className="font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
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
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Top 15 Clientes</h2>
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
