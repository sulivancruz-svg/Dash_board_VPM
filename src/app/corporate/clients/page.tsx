'use client';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/corporate/DataTable';

interface ClientData extends Record<string, unknown> {
  id: string;
  name: string;
  revenue: number;
  sales: number;
  avgTicket: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/corporate/clients?limit=50', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setClients(d.clients); setLoading(false); })
      .catch(e => {
        if (e instanceof Error && e.name !== 'AbortError') {
          const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
          setError(`Falha ao carregar dados: ${errorMsg}`);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) return <div className="text-center py-12" role="status" aria-live="polite" aria-label="Carregando dados de clientes">Carregando...</div>;

  if (error) return <div className="text-center py-12 text-red-600" role="alert">{error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Análise por Cliente</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Clientes</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Cliente' },
            { key: 'revenue', label: 'Receita', format: 'currency' },
            { key: 'sales', label: 'Vendas' },
            { key: 'avgTicket', label: 'Ticket Médio', format: 'currency' },
          ]}
          data={clients}
        />
      </div>
    </div>
  );
}
