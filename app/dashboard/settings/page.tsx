'use client';

import { useEffect, useState } from 'react';

interface Settings {
  id: string;
  googleSheetsId: string;
  googleSheetsGid: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    googleSheetsId: '',
    googleSheetsGid: '',
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/corporate/settings', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data: Settings = await response.json();
        setSettings(data);
        setFormData({
          googleSheetsId: data.googleSheetsId,
          googleSheetsGid: data.googleSheetsGid,
        });
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    return () => controller.abort();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    try {
      const response = await fetch('/api/corporate/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const updatedSettings: Settings = await response.json();
      setSettings(updatedSettings);
      setSuccess(true);
      setError(null);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      setSuccess(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-cyan-100/70">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Fonte de dados</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Configurações</h1>
        <p className="mt-1 text-cyan-100/60">Gerencie a planilha Google Sheets conectada ao painel.</p>
      </div>

      <div className="max-w-3xl rounded border border-cyan-400/15 bg-[#0B2440] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
        <h2 className="mb-6 text-xl font-semibold text-white">Google Sheets</h2>

        {error && <div className="mb-4 rounded border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">Erro: {error}</div>}
        {success && <div className="mb-4 rounded border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">Configurações salvas com sucesso.</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block font-medium text-cyan-100">Google Sheets ID</label>
            <input
              type="text"
              name="googleSheetsId"
              value={formData.googleSheetsId}
              onChange={handleChange}
              placeholder="Ex: 1IGELGbij2xDKWvKpX_qnIlCE_PK9Uxf1fctr73Y2JOk"
              className="w-full rounded border border-cyan-300/20 bg-[#07182D] px-4 py-2 text-cyan-50 outline-none focus:border-emerald-300"
              required
            />
            <p className="mt-2 text-sm text-cyan-100/50">ID da planilha Google Sheets encontrado na URL.</p>
          </div>

          <div>
            <label className="mb-2 block font-medium text-cyan-100">Google Sheets GID</label>
            <input
              type="text"
              name="googleSheetsGid"
              value={formData.googleSheetsGid}
              onChange={handleChange}
              placeholder="Ex: 2124022251"
              className="w-full rounded border border-cyan-300/20 bg-[#07182D] px-4 py-2 text-cyan-50 outline-none focus:border-emerald-300"
              required
            />
            <p className="mt-2 text-sm text-cyan-100/50">ID da aba específica dentro da planilha.</p>
          </div>

          <button type="submit" className="w-full rounded bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300">
            Salvar Configurações
          </button>
        </form>

        {settings?.updatedAt && (
          <div className="mt-6 border-t border-cyan-400/15 pt-6">
            <p className="text-sm text-cyan-100/50">Última atualização: {new Date(settings.updatedAt).toLocaleString('pt-BR')}</p>
          </div>
        )}
      </div>

      <div className="max-w-3xl rounded border border-cyan-400/15 bg-[#0B2440] p-6 shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
        <h2 className="mb-4 text-xl font-semibold text-white">Como configurar</h2>
        <ol className="list-inside list-decimal space-y-3 text-sm text-cyan-100/75">
          <li>Acesse sua planilha Google Sheets.</li>
          <li>
            Copie o ID da URL, entre <code className="rounded bg-slate-950/60 px-2 py-1 text-cyan-50">/d/</code> e{' '}
            <code className="rounded bg-slate-950/60 px-2 py-1 text-cyan-50">/edit</code>.
          </li>
          <li>Copie o GID da aba usada como fonte dos dados.</li>
          <li>Cole os valores nos campos acima e salve.</li>
        </ol>
      </div>
    </div>
  );
}
