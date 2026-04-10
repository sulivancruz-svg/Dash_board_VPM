'use client';

import { useEffect, useState } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import type { PipedriveDirectRecentDeal } from '@/lib/pipedrive-direct-store';

interface LiviaStats {
  totalCreated: number;
  totalWon: number;
  totalOpen: number;
  totalLost: number;
  winRate: number;
  deals: PipedriveDirectRecentDeal[];
}

export default function LiviaAnalysisPage() {
  const [stats, setStats] = useState<LiviaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function analyze() {
      try {
        // Busca dados do Pipedrive Direto
        let response = await fetch('/api/pipedrive-direct');
        if (!response.ok) throw new Error('Falha ao carregar dados do Pipedrive');

        let data = await response.json();
        let directData = data.data;

        // Se não houver dados, tenta sincronizar
        if (!directData || !directData.allDeals || directData.allDeals.length === 0) {
          console.log('Sincronizando dados do Pipedrive...');
          const syncResponse = await fetch('/api/pipedrive-direct/sync', { method: 'POST' });
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log('Sincronização concluída:', syncData);

            // Tenta buscar novamente após sincronização
            const retryResponse = await fetch('/api/pipedrive-direct');
            if (retryResponse.ok) {
              data = await retryResponse.json();
              directData = data.data;
            }
          }
        }

        if (!directData) {
          throw new Error('Dados do Pipedrive não disponíveis. Configure a conexão na aba "Pipedrive Direto"');
        }

        if (!directData.allDeals || directData.allDeals.length === 0) {
          throw new Error('Nenhum dado sincronizado. Verifique a configuração do Pipedrive Direto.');
        }

        // Filtra deals de Livia
        const liviaDeals = (directData.allDeals || [])
          .filter((deal: PipedriveDirectRecentDeal) => deal.ownerName && deal.ownerName.toLowerCase().includes('livia'));

        if (liviaDeals.length === 0) {
          throw new Error('Nenhum deal encontrado para Livia. Verifique se o Pipedrive está sincronizado.');
        }

        // Calcula métricas
        let won = 0;
        let open = 0;
        let lost = 0;

        liviaDeals.forEach((deal: PipedriveDirectRecentDeal) => {
          const status = deal.status?.toLowerCase() || 'open';
          if (status === 'won') won += 1;
          else if (status === 'lost') lost += 1;
          else open += 1;
        });

        const winRate = liviaDeals.length > 0 ? (won / liviaDeals.length) * 100 : 0;

        setStats({
          totalCreated: liviaDeals.length,
          totalWon: won,
          totalOpen: open,
          totalLost: lost,
          winRate,
          deals: liviaDeals.sort((a: PipedriveDirectRecentDeal, b: PipedriveDirectRecentDeal) => {
            // Status vencido primeiro
            const statusOrder = { won: 0, open: 1, lost: 2 };
            const aStatus = (a.status?.toLowerCase() || 'open') as keyof typeof statusOrder;
            const bStatus = (b.status?.toLowerCase() || 'open') as keyof typeof statusOrder;
            const statusDiff = (statusOrder[aStatus] ?? 1) - (statusOrder[bStatus] ?? 1);
            if (statusDiff !== 0) return statusDiff;
            // Depois por data (mais recentes primeiro)
            return String(b.addTime || '').localeCompare(String(a.addTime || ''));
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

          {/* Deals Vencidos */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
              Deals Vencidos
            </p>
            <p className="text-3xl font-bold text-emerald-600">
              {stats?.totalWon || '—'}
            </p>
          </div>

          {/* Deals em Aberto */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
              Em Aberto
            </p>
            <p className="text-3xl font-bold text-amber-600">
              {stats?.totalOpen || '—'}
            </p>
          </div>

          {/* Taxa de Vitória */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
              Taxa de Vitória
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {stats?.winRate ? `${stats.winRate.toFixed(1)}%` : '—'}
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
                      Título
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Pipeline
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
                        {deal.title || `Deal ${deal.id}`}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {deal.canal || deal.howArrived || 'Nao Informado'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          deal.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                          deal.status === 'lost' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {deal.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {deal.addTime ? new Date(deal.addTime).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {deal.pipelineName || '—'}
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
            <strong>ℹ️ Informação:</strong> Os dados são carregados automaticamente do Pipedrive Direto.
            A tabela mostra todos os deals criados por Livia, com status atual no pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
