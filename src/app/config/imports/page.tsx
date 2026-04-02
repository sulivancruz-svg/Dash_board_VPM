'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Upload, Trash2 } from 'lucide-react';

interface ImportStatus {
  source: string;
  isLoaded: boolean;
  lastUpdated: string | null;
  dataCount: number | null;
}

export default function ImportsPage() {
  const [statuses, setStatuses] = useState<ImportStatus[]>([
    { source: 'SDR', isLoaded: false, lastUpdated: null, dataCount: null },
    { source: 'Google Ads', isLoaded: false, lastUpdated: null, dataCount: null },
    { source: 'Pipedrive', isLoaded: false, lastUpdated: null, dataCount: null },
  ]);

  const [uploading, setUploading] = useState<string | null>(null);

  // Verificar status de cada fonte ao carregar a página
  useEffect(() => {
    checkStatuses();
  }, []);

  async function checkStatuses() {
    try {
      const [sdrRes, googleRes, pipeRes] = await Promise.all([
        fetch('/api/imports/sdr'),
        fetch('/api/imports/google-ads'),
        fetch('/api/imports/pipedrive'),
      ]);

      const newStatuses = [...statuses];

      // Check SDR
      if (sdrRes.ok) {
        const sdrData = await sdrRes.json();
        newStatuses[0] = {
          source: 'SDR',
          isLoaded: true,
          lastUpdated: sdrData.updatedAt,
          dataCount: sdrData.totalSales || 0,
        };
      }

      // Check Google Ads
      if (googleRes.ok) {
        const googleData = await googleRes.json();
        newStatuses[1] = {
          source: 'Google Ads',
          isLoaded: true,
          lastUpdated: googleData.updatedAt,
          dataCount: googleData.months?.length || 0,
        };
      }

      // Check Pipedrive
      if (pipeRes.ok) {
        const pipeData = await pipeRes.json();
        newStatuses[2] = {
          source: 'Pipedrive',
          isLoaded: true,
          lastUpdated: pipeData.updatedAt,
          dataCount: pipeData.totalSales || 0,
        };
      }

      setStatuses(newStatuses);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    source: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(source);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = source === 'SDR'
        ? '/api/imports/sdr'
        : source === 'Google Ads'
        ? '/api/imports/google-ads'
        : '/api/imports/pipedrive';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await checkStatuses();
        alert(`✅ ${source} carregado com sucesso!`);
      } else {
        alert(`❌ Erro ao carregar ${source}`);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert(`❌ Erro ao processar ${source}`);
    } finally {
      setUploading(null);
      // Reset input
      if (e.target) {
        e.target.value = '';
      }
    }
  }

  async function handleClearData(source: string) {
    if (!confirm(`Tem certeza que quer limpar os dados de ${source}?`)) {
      return;
    }

    try {
      const endpoint = source === 'SDR'
        ? '/api/imports/sdr/clear'
        : source === 'Google Ads'
        ? '/api/imports/google-ads/clear'
        : '/api/imports/pipedrive/clear';

      const response = await fetch(endpoint, { method: 'POST' });

      if (response.ok) {
        await checkStatuses();
        alert(`✅ Dados de ${source} removidos!`);
      }
    } catch (error) {
      console.error('Erro ao limpar:', error);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Dados</h1>
        <p className="text-gray-600 mt-2">
          Carregue planilhas de SDR, Google Ads e Pipedrive para análise
        </p>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statuses.map((status) => (
          <div key={status.source} className={`p-4 rounded-lg border-2 ${status.isLoaded ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{status.source}</h3>
              {status.isLoaded ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {status.isLoaded ? (
              <>
                <div className="text-sm space-y-1 mb-3">
                  <p className="text-gray-600">Status: <span className="text-green-600 font-semibold">✅ Carregado</span></p>
                  <p className="text-gray-600 text-xs">
                    Atualizado: {new Date(status.lastUpdated!).toLocaleDateString('pt-BR')}
                  </p>
                  {status.dataCount !== null && (
                    <p className="text-gray-600 text-xs">
                      Registros: {status.dataCount}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleClearData(status.source)}
                  className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover dados
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500">Nenhum dado carregado</p>
            )}
          </div>
        ))}
      </div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SDR Upload */}
        <div className="border-2 border-gray-200 rounded-lg p-4">
          <h3 className="text-base font-semibold mb-1">Planilha SDR</h3>
          <p className="text-sm text-gray-600 mb-4">Excel com leads, qualificados e vendas</p>
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, 'SDR')}
              disabled={uploading === 'SDR'}
              className="hidden"
            />
            <button
              disabled={uploading === 'SDR'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading === 'SDR' ? 'Carregando...' : 'Selecionar arquivo'}
            </button>
          </label>
          <p className="text-xs text-gray-500 mt-2">Formato: .xlsx ou .xls</p>
        </div>

        {/* Google Ads Upload */}
        <div className="border-2 border-gray-200 rounded-lg p-4">
          <h3 className="text-base font-semibold mb-1">Google Ads</h3>
          <p className="text-sm text-gray-600 mb-4">CSV com custos e impressões</p>
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, 'Google Ads')}
              disabled={uploading === 'Google Ads'}
              className="hidden"
            />
            <button
              disabled={uploading === 'Google Ads'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading === 'Google Ads' ? 'Carregando...' : 'Selecionar arquivo'}
            </button>
          </label>
          <p className="text-xs text-gray-500 mt-2">Formato: .csv</p>
        </div>

        {/* Pipedrive Upload */}
        <div className="border-2 border-gray-200 rounded-lg p-4">
          <h3 className="text-base font-semibold mb-1">Pipedrive</h3>
          <p className="text-sm text-gray-600 mb-4">CSV com vendas e receita</p>
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, 'Pipedrive')}
              disabled={uploading === 'Pipedrive'}
              className="hidden"
            />
            <button
              disabled={uploading === 'Pipedrive'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading === 'Pipedrive' ? 'Carregando...' : 'Selecionar arquivo'}
            </button>
          </label>
          <p className="text-xs text-gray-500 mt-2">Formato: .csv</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="text-base font-semibold mb-3">💡 Como obter os arquivos</h3>
        <div className="space-y-2 text-sm">
          <p>
            <strong>SDR:</strong> Abra a planilha Excel original e salve como .xlsx
          </p>
          <p>
            <strong>Google Ads:</strong> Vá em Relatórios → Baixe o CSV com Data, Custo, Cliques, Impressões
          </p>
          <p>
            <strong>Pipedrive:</strong> Vá em Relatórios → Exporte com Data, Valor da Venda, Status
          </p>
        </div>
      </div>
    </div>
  );
}
