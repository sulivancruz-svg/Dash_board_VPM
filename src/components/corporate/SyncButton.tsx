'use client';
import { useState } from 'react';

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/corporate/sync-manual', { method: 'POST' });
      if (res.ok) {
        setLastSync(new Date().toLocaleString('pt-BR'));
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Sincronizando...' : 'Sincronizar'}
      </button>
      {lastSync && <span className="text-sm text-gray-600">Última sincronização: {lastSync}</span>}
    </div>
  );
}
