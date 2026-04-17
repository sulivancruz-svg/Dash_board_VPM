'use client';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/corporate/DataTable';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate/clients?limit=50')
      .then(r => r.json())
      .then(d => { setClients(d.clients); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12">Carregando...</div>;

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
