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
      // Sync error handled gracefully - user sees disabled button
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSync}
        disabled={loading}
        className={`relative px-6 py-2.5 font-semibold rounded-lg transition-all duration-300 transform ${
          loading
            ? 'scale-95 opacity-75 cursor-not-allowed'
            : 'hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50'
        } bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-md`}
      >
        <span className="flex items-center gap-2">
          {loading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {loading ? 'Sincronizando...' : 'Sincronizar'}
        </span>
      </button>
      {lastSync && (
        <span className="text-xs text-slate-400 font-medium">
          Sincronizado: {lastSync}
        </span>
      )}
    </div>
  );
}
