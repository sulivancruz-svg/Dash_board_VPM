'use client';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/corporate/DataTable';

interface BehavioralProfile {
  profile: string;
  revenue: number;
  count: number;
}

interface LeadTimeItem extends Record<string, unknown> {
  leadTimeDays: number;
  profile: string;
  revenue: number;
}

interface BehavioralData {
  profiles: BehavioralProfile[];
  leadTimeDistribution: LeadTimeItem[];
}

export default function BehavioralPage() {
  const [data, setData] = useState<BehavioralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/corporate/behavioral', { signal: controller.signal })
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

  if (loading) return <div className="text-center py-12" role="status" aria-live="polite" aria-label="Carregando dados comportamentais">Carregando...</div>;

  if (error) return <div className="text-center py-12 text-red-600" role="alert" aria-live="assertive">{error}</div>;

  if (!data) return <div className="text-center py-12 text-red-600" role="alert" aria-live="assertive">Sem dados disponíveis</div>;

  const { profiles, leadTimeDistribution } = data;

  const profileColors: Record<string, { bg: string; text: string }> = {
    'Urgente': { bg: 'bg-red-100', text: 'text-red-800' },
    'Normal': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'Planejado': { bg: 'bg-green-100', text: 'text-green-800' },
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Análise Comportamental</h1>

      {/* Profile Cards */}
      <div className="grid grid-cols-3 gap-6">
        {profiles.map((profile) => {
          const colors = profileColors[profile.profile] || { bg: 'bg-gray-100', text: 'text-gray-800' };
          return (
            <div
              key={profile.profile}
              className={`rounded-lg shadow p-6 ${colors.bg}`}
            >
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>{profile.profile}</h3>
              <div className={`text-2xl font-bold mb-2 ${colors.text}`}>
                R$ {profile.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className={`text-sm ${colors.text}`}>{profile.count} vendas</p>
            </div>
          );
        })}
      </div>

      {/* Lead Time Distribution Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Antecedência (Lead Time)</h2>
        <DataTable
          columns={[
            { key: 'leadTimeDays', label: 'Dias de Antecedência' },
            { key: 'profile', label: 'Perfil' },
            { key: 'revenue', label: 'Receita', format: 'currency' },
          ]}
          data={leadTimeDistribution.slice(0, 20)}
        />
      </div>
    </div>
  );
}
