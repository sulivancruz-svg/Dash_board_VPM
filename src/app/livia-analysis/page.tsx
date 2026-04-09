'use client';

import { useEffect, useState } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import type { PipedriveDealRecord, PipedriveStore } from '@/lib/data-store';

interface LiviaStats {
  totalCreated: number;
  totalSalesInMonde: number;
  conversionRate: number;
  totalRevenue: number;
  deals: PipedriveDealRecord[];
}

export default function LiviaAnalysisPage() {
  const [stats, setStats] = useState<LiviaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function analyze() {
      try {
        // Busca dados do Pipedrive
        const response = await fetch('/api/data/overview');
        if (!response.ok) throw new Error('Falha ao carregar dados');

        const data = await response.json();
        const pipedriveStore = data.pipedrive;

        if (!pipedriveStore) {
          throw new Error('Dados do Pipedrive não disponíveis');
        }

        // Filtra deals criados por Livia
        const liviaDeals = [
          ...(pipedriveStore.pipelineDeals || []),
          ...(pipedriveStore.mondeDeals || []),
        ].filter((deal) => deal.ownerName && deal.ownerName.toLowerCase().includes('livia'));

        // Remove duplicatas (alguns deals aparecem em ambas as listas)
        const uniqueDealsMap = new Map<string, PipedriveDealRecord>();
        liviaDeals.forEach((deal) => {
          if (!uniqueDealsMap.has(deal.id) || deal.hasMondeBilling) {
            uniqueDealsMap.set(deal.id, deal);
          }
        });

        const uniqueDeals = Array.from(uniqueDealsMap.values());
        const dealsBecameSales = uniqueDeals.filter((deal) => deal.hasMondeBilling);
        const conversionRate = uniqueDeals.length > 0
          ? (dealsBecameSales.length / uniqueDeals.length) * 100
          : 0;
        const totalRevenue = dealsBecameSales.reduce((sum, deal) => sum + (deal.receita || 0), 0);

        setStats({
          totalCreated: uniqueDeals.length,
          totalSalesInMonde: dealsBecameSales.length,
          conversionRate,
          totalRevenue,
          deals: uniqueDeals.sort((a, b) => {
            // Coloca as vendas realizadas primeiro
            if (a.hasMondeBilling !== b.hasMondeBilling) {
              return (b.hasMondeBilling ? 1 : 0) - (a.hasMondeBilling ? 1 : 0);
            }
            // Depois ordena por data (mais recentes primeiro)
            return (b.createdDate || '').localeCompare(a.createdDate || '');
          }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Análise de Vendas - Livia
          </h1>
          <p className="text-slate-600">
            Cruzamento entre deals criados no Pipedrive e vendas reais no Monde
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
          {/* Total Criado */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
              Deals Criados
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.totalCreated || '—'}
            </p>
          </div>

          {/* Vendidos no Monde */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
              Viraram Venda (Monde)
            </p>
            <p className="text-3xl font-bold text-emerald-600">
              {stats?.totalSalesInMonde || '—'}
            </p>
          </div>

          {/* Taxa de Conversão */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
              Taxa de Conversão
            </p>
            <p className="text-3xl font-bold text-amber-600">
              {stats?.conversionRate ? `${stats.conversionRate.toFixed(1)}%` : '—'}
            </p>
          </div>

          {/* Receita Total */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
              Receita Total
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {stats?.totalRevenue ? `R$ ${(stats.totalRevenue / 1000).toFixed(0)}k` : '—'}
            </p>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900">Erro ao carregar dados</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Tabela de Deals */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">
              Deals de Livia
            </h2>
          </div>

          {stats?.deals && stats.deals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Deal ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Canal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Criado em
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      Receita
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Venda Monde
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-mono text-slate-600">
                        {deal.id}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {deal.canal}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          deal.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                          deal.status === 'lost' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {deal.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {deal.createdDate || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-semibold text-slate-900">
                        R$ {deal.receita.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          deal.hasMondeBilling
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {deal.hasMondeBilling ? '✓ Sim' : '✗ Não'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="text-slate-500">
                Nenhum deal encontrado para análise
              </p>
            </div>
          )}
        </div>

        {/* Nota de Desenvolvimento */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>📝 Nota:</strong> Esta é uma aba de teste isolada. Os dados estão sendo carregados
            do endpoint `/api/data/overview`. Quando os dados incluírem `ownerId` para Livia, a tabela
            será preenchida automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
