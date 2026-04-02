'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload, Key, Database, CheckCircle, XCircle, AlertCircle,
  Loader, ChevronDown, BarChart3, RefreshCw, Unlink, Settings, Palette,
} from 'lucide-react';
import { BRANDING_EVENT_NAME } from '@/lib/branding-events';
import { FormInput, FormSection, FormLabel, FileUpload } from '@/components/form';
import { Button } from '@/components/button';

interface AdAccount { id: string; name: string; status: number; }

interface SourceControls {
  sdrEnabled: boolean;
  pipedriveEnabled: boolean;
  googleAdsEnabled: boolean;
}

interface GoogleApiStatus {
  configured: boolean;
  serviceAccountEmail?: string;
  customerId?: string;
  configuredAt?: string;
}

interface BrandingSettings {
  companyName: string;
  logoPath: string | null;
  logoUrl: string | null;
  updatedAt: string | null;
}

export default function SettingsPage() {
  // ── Meta Ads ──
  const [metaStatus, setMetaStatus] = useState<'connected' | 'disconnected' | 'expired'>('disconnected');
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaMessage, setMetaMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUserName, setPendingUserName] = useState<string>('');
  const [availableAccounts, setAvailableAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // ── SDR ──
  const [sdrFile, setSdrFile] = useState<File | null>(null);
  const [sdrDragging, setSdrDragging] = useState(false);
  const [sdrMessage, setSdrMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Pipedrive ──
  const [pipeFile, setPipeFile] = useState<File | null>(null);
  const [pipeDragging, setPipeDragging] = useState(false);
  const [pipeMessage, setPipeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Google Ads CSV (fallback) ──
  const [googleFile, setGoogleFile] = useState<File | null>(null);
  const [googleDragging, setGoogleDragging] = useState(false);
  const [googleMessage, setGoogleMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [googleStatus, setGoogleStatus] = useState<{ loaded: boolean; updatedAt: string | null; months: number; source?: string }>(
    { loaded: false, updatedAt: null, months: 0 },
  );

  // ── Google Ads API (Conta de Serviço) ──
  const [googleApiStatus, setGoogleApiStatus] = useState<GoogleApiStatus>({ configured: false });
  const [googleApiJson, setGoogleApiJson] = useState('');
  const [googleApiDevToken, setGoogleApiDevToken] = useState('');
  const [googleApiCustomerId, setGoogleApiCustomerId] = useState('');
  const [googleApiManagerId, setGoogleApiManagerId] = useState('');
  const [googleApiSaving, setGoogleApiSaving] = useState(false);
  const [googleApiSyncing, setGoogleApiSyncing] = useState(false);
  const [googleApiMessage, setGoogleApiMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ── Source Controls ──
  const [sourceControls, setSourceControls] = useState<SourceControls>({
    sdrEnabled: true, pipedriveEnabled: true, googleAdsEnabled: true,
  });
  const [controlsLoading, setControlsLoading] = useState(false);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    companyName: 'Marketing Dashboard',
    logoPath: null,
    logoUrl: null,
    updatedAt: null,
  });
  const [brandingName, setBrandingName] = useState('Marketing Dashboard');
  const [brandingLogoFile, setBrandingLogoFile] = useState<File | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Init ──
  useEffect(() => {
    fetch('/api/settings/branding')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setBrandingSettings(d);
          setBrandingName(d.companyName || 'Marketing Dashboard');
        }
      })
      .catch(() => {});

    fetch('/api/imports/google-ads')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setGoogleStatus({ loaded: true, updatedAt: d.updatedAt, months: d.months?.length || 0, source: d.source });
      })
      .catch(() => {});

    fetch('/api/google-ads/credentials')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGoogleApiStatus(d); })
      .catch(() => {});

    fetch('/api/imports/source-controls')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setSourceControls({ sdrEnabled: d.sdrEnabled ?? true, pipedriveEnabled: d.pipedriveEnabled ?? true, googleAdsEnabled: d.googleAdsEnabled ?? true });
      })
      .catch(() => {});
  }, []);

  // ── Source Controls ──
  const handleToggleSource = async (source: keyof SourceControls) => {
    const nextControls = { ...sourceControls, [source]: !sourceControls[source] };
    setControlsLoading(true);
    try {
      const response = await fetch('/api/imports/source-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextControls),
      });
      const data = await response.json();
      if (response.ok && data.controls) setSourceControls(data.controls);
    } catch (error) {
      console.error('Erro ao atualizar fonte:', error);
    } finally {
      setControlsLoading(false);
    }
  };

  // ── Meta Ads ──
  const handleBrandingSave = async (removeLogo = false) => {
    setBrandingSaving(true);
    setBrandingMessage(null);
    try {
      const formData = new FormData();
      formData.append('companyName', brandingName);
      if (brandingLogoFile && !removeLogo) {
        formData.append('logo', brandingLogoFile);
      }
      if (removeLogo) {
        formData.append('removeLogo', 'true');
      }

      const response = await fetch('/api/settings/branding', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setBrandingSettings(data);
        setBrandingName(data.companyName || brandingName);
        setBrandingLogoFile(null);
        setBrandingMessage({ text: data.message || 'Identidade visual atualizada', type: 'success' });
        window.dispatchEvent(new CustomEvent(BRANDING_EVENT_NAME));
      } else {
        setBrandingMessage({ text: data.error || 'Erro ao salvar identidade visual', type: 'error' });
      }
    } catch {
      setBrandingMessage({ text: 'Erro de conexao', type: 'error' });
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleMetaTokenSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMetaLoading(true);
    setMetaMessage({ text: '', type: null });
    setAvailableAccounts([]);
    setPendingToken(null);
    const formData = new FormData(e.currentTarget);
    const token = formData.get('meta-token') as string;
    if (!token?.trim()) {
      setMetaMessage({ text: 'Por favor, insira um token valido', type: 'error' });
      setMetaLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/meta/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'SELECT_ACCOUNT') {
        setPendingToken(token.trim());
        setPendingUserName(data.userName || '');
        setAvailableAccounts(data.accounts || []);
        setSelectedAccountId(data.accounts?.[0]?.id || '');
        setMetaMessage({ text: 'Selecione qual conta de anuncios usar:', type: null });
        (e.target as HTMLFormElement).reset();
      } else if (response.ok && data.status === 'CONNECTED') {
        setMetaStatus('connected');
        setMetaMessage({ text: `Conectado! Conta: ${data.accountName || data.accountId}`, type: 'success' });
        (e.target as HTMLFormElement).reset();
      } else {
        setMetaStatus('disconnected');
        setMetaMessage({ text: `${data.error || 'Erro ao validar token'}`, type: 'error' });
      }
    } catch {
      setMetaStatus('disconnected');
      setMetaMessage({ text: 'Erro de conexao. Verifique se o token e valido.', type: 'error' });
    } finally {
      setMetaLoading(false);
    }
  };

  const handleSelectAccount = async () => {
    if (!pendingToken || !selectedAccountId) return;
    setMetaLoading(true);
    const account = availableAccounts.find(a => a.id === selectedAccountId);
    try {
      const res = await fetch('/api/meta/select-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pendingToken, accountId: selectedAccountId, accountName: account?.name || selectedAccountId, userName: pendingUserName }),
      });
      const data = await res.json();
      if (res.ok) {
        setMetaStatus('connected');
        setMetaMessage({ text: `Conectado! Conta: ${account?.name || selectedAccountId}`, type: 'success' });
        setAvailableAccounts([]);
        setPendingToken(null);
      } else {
        setMetaMessage({ text: data.error, type: 'error' });
      }
    } catch {
      setMetaMessage({ text: 'Erro ao salvar conta', type: 'error' });
    } finally {
      setMetaLoading(false);
    }
  };

  // ── Google Ads CSV ──
  const handleGoogleAdsUpload = async (file: File) => {
    setGoogleFile(file);
    setGoogleMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/imports/google-ads/csv', { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) {
        setGoogleMessage({ text: `${d.message || 'Google Ads importado com sucesso'}`, type: 'success' });
        setGoogleStatus({ loaded: true, updatedAt: new Date().toISOString(), months: d.monthsCount || 0, source: 'csv' });
        setSourceControls(current => ({ ...current, googleAdsEnabled: true }));
      } else {
        setGoogleMessage({ text: d.error || 'Erro ao importar', type: 'error' });
      }
    } catch {
      setGoogleMessage({ text: 'Erro de conexao', type: 'error' });
    }
  };

  // ── Google Ads API (Conta de Serviço) ──
  const handleGoogleApiSave = async () => {
    if (!googleApiJson.trim() || !googleApiDevToken.trim() || !googleApiCustomerId.trim()) {
      setGoogleApiMessage({ text: 'Preencha todos os campos obrigatorios', type: 'error' });
      return;
    }
    setGoogleApiSaving(true);
    setGoogleApiMessage(null);
    try {
      const res = await fetch('/api/google-ads/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccountJson: googleApiJson.trim(),
          developerToken: googleApiDevToken.trim(),
          customerId: googleApiCustomerId.trim(),
          managerCustomerId: googleApiManagerId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoogleApiMessage({ text: `Credenciais salvas! Conta: ${data.serviceAccountEmail}`, type: 'success' });
        setGoogleApiStatus({ configured: true, serviceAccountEmail: data.serviceAccountEmail, customerId: data.customerId, configuredAt: new Date().toISOString() });
        setGoogleApiJson('');
        setGoogleApiDevToken('');
        setGoogleApiCustomerId('');
        setGoogleApiManagerId('');
      } else {
        setGoogleApiMessage({ text: data.error || 'Erro ao salvar', type: 'error' });
      }
    } catch {
      setGoogleApiMessage({ text: 'Erro de conexao', type: 'error' });
    } finally {
      setGoogleApiSaving(false);
    }
  };

  const handleGoogleApiSync = async () => {
    setGoogleApiSyncing(true);
    setGoogleApiMessage({ text: 'Sincronizando com Google Ads API...', type: 'info' });
    try {
      const res = await fetch('/api/google-ads/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setGoogleApiMessage({
          text: `${data.message} | R$${parseFloat(data.totalSpend).toLocaleString('pt-BR')} | ${data.totalClicks.toLocaleString('pt-BR')} cliques`,
          type: 'success',
        });
        setGoogleStatus({ loaded: true, updatedAt: new Date().toISOString(), months: data.monthsCount || 0, source: 'api' });
        setSourceControls(current => ({ ...current, googleAdsEnabled: true }));
      } else {
        setGoogleApiMessage({ text: data.error || 'Erro ao sincronizar', type: 'error' });
      }
    } catch {
      setGoogleApiMessage({ text: 'Erro de conexao', type: 'error' });
    } finally {
      setGoogleApiSyncing(false);
    }
  };

  const handleGoogleApiDisconnect = async () => {
    try {
      await fetch('/api/google-ads/credentials', { method: 'DELETE' });
      setGoogleApiStatus({ configured: false });
      setGoogleApiMessage({ text: 'Credenciais removidas', type: 'info' });
    } catch {
      setGoogleApiMessage({ text: 'Erro ao remover', type: 'error' });
    }
  };

  // ── SDR ──
  const handleSdrUpload = async (file: File) => {
    setSdrFile(file);
    setSdrMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/imports/sdr', { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) {
        setSdrMessage({ text: d.message || `${d.totalRows || ''} registros importados`, type: 'success' });
      } else {
        setSdrMessage({ text: d.error || 'Erro ao importar', type: 'error' });
      }
    } catch {
      setSdrMessage({ text: 'Erro de conexao', type: 'error' });
    }
  };

  // ── Pipedrive ──
  const handlePipedriveUpload = async (file: File) => {
    setPipeFile(file);
    setPipeMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/imports/pipedrive', { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) {
        setPipeMessage({ text: d.message || `${d.totalRows || ''} registros importados`, type: 'success' });
      } else {
        setPipeMessage({ text: d.error || 'Erro ao importar', type: 'error' });
      }
    } catch {
      setPipeMessage({ text: 'Erro de conexao', type: 'error' });
    }
  };

  const StatusIcon = metaStatus === 'connected' ? CheckCircle : metaStatus === 'expired' ? AlertCircle : XCircle;
  const statusColor = metaStatus === 'connected' ? 'text-emerald-500' : metaStatus === 'expired' ? 'text-amber-500' : 'text-red-400';
  const statusLabel = metaStatus === 'connected' ? 'Conectado' : metaStatus === 'expired' ? 'Token Expirado' : 'Desconectado';

  const msgClass = (type: 'success' | 'error' | 'info' | null) =>
    type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : type === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
    : 'bg-blue-50 text-blue-700 border border-blue-200';

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Sistema</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações</h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
          <FormSection
            title="Identidade da Empresa"
            description="Logo e nome exibidos no canto superior esquerdo"
            icon={<Palette className="w-5 h-5" />}
          >
            {/* Logo Preview */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
              {brandingSettings.logoUrl ? (
                <img
                  src={brandingSettings.logoUrl}
                  alt={brandingSettings.companyName}
                  className="h-14 w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-base font-bold text-white">
                  {(brandingName.trim().charAt(0) || 'M').toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{brandingSettings.companyName || brandingName || 'Marketing Dashboard'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Preview do menu lateral</p>
              </div>
            </div>

            {/* Company Name Input */}
            <FormInput
              label="Nome da Empresa"
              value={brandingName}
              onChange={e => setBrandingName(e.target.value)}
              placeholder="ex: Vai Pro Mundo"
              required
            />

            {/* Logo Upload */}
            <FileUpload
              label="Logomarca"
              description="PNG, JPG, WEBP ou SVG (máx 5MB)"
              accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
              onFileSelect={file => setBrandingLogoFile(file)}
              selectedFile={brandingLogoFile}
            />

            {/* Status Message */}
            {brandingMessage && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                brandingMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {brandingMessage.text}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleBrandingSave(false)}
                disabled={brandingSaving || !brandingName.trim()}
                isLoading={brandingSaving}
                className="flex-1"
              >
                {brandingSaving ? 'Salvando...' : 'Salvar Identidade'}
              </Button>
              {brandingSettings.logoPath && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleBrandingSave(true)}
                  disabled={brandingSaving}
                  className="px-4"
                >
                  Remover Logo
                </Button>
              )}
            </div>
          </FormSection>
        </div>
      </div>

      {/* ── Source Controls ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
          <FormSection
            title="Fontes de Dados"
            description="Ative ou desative fontes de dados sem perder o arquivo importado"
            icon={<BarChart3 className="w-5 h-5" />}
          >
            <div className="space-y-3">
              {[
                { key: 'sdrEnabled' as const, label: 'SDR', description: 'Leads qualificados e resumo mensal' },
                { key: 'pipedriveEnabled' as const, label: 'Pipedrive / Monde', description: 'Vendas e receita por canal (fonte oficial)' },
                { key: 'googleAdsEnabled' as const, label: 'Google Ads', description: 'Custos e métricas de mídia paga' },
              ].map(source => {
                const enabled = sourceControls[source.key];
                return (
                  <div
                    key={source.key}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{source.label}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{source.description}</p>
                    </div>
                    <Button
                      variant={enabled ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleSource(source.key)}
                      disabled={controlsLoading}
                      className="ml-4"
                    >
                      {enabled ? '✓ Ativo' : 'Desativado'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </FormSection>
        </div>
      </div>

      {/* ── Meta Ads ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
          <FormSection
            title="Meta Ads API"
            description="Business Use Case Token - Conecte sua conta de anuncios"
            icon={<Key className="w-5 h-5" />}
          >
            <form onSubmit={handleMetaTokenSubmit} className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
              </div>

              {/* Token Input */}
              <FormInput
                label="Token de Acesso"
                type="password"
                name="meta-token"
                placeholder="EAAB..."
                disabled={metaLoading}
                description="Criptografado com AES-256. Nunca exposto em logs ou respostas."
              />

              {/* Messages */}
              {metaMessage.text && (
                <div className={`p-3 rounded-lg text-sm font-medium ${msgClass(metaMessage.type)}`}>
                  {metaMessage.text}
                </div>
              )}

              {/* Account Selection */}
              {availableAccounts.length > 0 && (
                <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Contas disponiveis</p>
                  <div className="relative">
                    <select
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 pr-8 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 appearance-none text-slate-900 dark:text-white transition-all"
                    >
                      {availableAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={handleSelectAccount}
                    disabled={metaLoading || !selectedAccountId}
                    isLoading={metaLoading}
                    className="w-full"
                  >
                    Usar esta conta
                  </Button>
                </div>
              )}

              {/* Submit Button */}
              {availableAccounts.length === 0 && (
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={metaLoading}
                  isLoading={metaLoading}
                  className="w-full"
                >
                  {metaLoading ? 'Validando...' : 'Validar e Conectar'}
                </Button>
              )}
            </form>
          </FormSection>
        </div>
      </div>

      {/* ── Google Ads API via Conta de Serviço ── */}
      <div className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm ${googleApiStatus.configured ? 'border-emerald-200 dark:border-emerald-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
          <FormSection
            title="Google Ads API"
            description="Conta de Serviço · Sincronização automática"
            icon={<BarChart3 className="w-5 h-5" />}
          >

            {/* Status cuando ja configurado */}
            {googleApiStatus.configured ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Conta de servico</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right max-w-[200px] truncate">
                      {googleApiStatus.serviceAccountEmail}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Customer ID</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{googleApiStatus.customerId}</span>
                  </div>
                  {googleStatus.loaded && (
                    <div className="flex items-center justify-between border-t border-emerald-200 dark:border-emerald-800 pt-2 mt-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Dados carregados</span>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        {googleStatus.months} {googleStatus.months === 1 ? 'mes' : 'meses'} via {googleStatus.source === 'api' ? 'API' : 'CSV'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={handleGoogleApiSync}
                    disabled={googleApiSyncing}
                    isLoading={googleApiSyncing}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {googleApiSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={handleGoogleApiDisconnect}
                    className="px-4"
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Formulario de configuracao */
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-xs text-amber-900 dark:text-amber-300 space-y-1.5">
                  <p className="font-semibold">Pre-requisitos para conectar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Adicione a conta de servico como usuario no Google Ads (acesso: Padrao)</li>
                    <li>Baixe o JSON da chave da conta de servico no Google Cloud Console</li>
                    <li>Obtenha o Developer Token em: Google Ads Manager → Ferramentas → API Center</li>
                  </ol>
                  <p className="text-amber-800 dark:text-amber-400 mt-2">Conta de servico: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">google-ads-dashboard@dashboard-489916.iam.gserviceaccount.com</code></p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">
                    JSON da Chave da Conta de Servico <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={googleApiJson}
                    onChange={e => setGoogleApiJson(e.target.value)}
                    placeholder={'{\n  "type": "service_account",\n  "project_id": "dashboard-489916",\n  "private_key": "-----BEGIN RSA PRIVATE KEY-----\\n...",\n  "client_email": "google-ads-dashboard@...",\n  ...\n}'}
                    rows={6}
                    className="w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 font-mono resize-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Cole o conteudo completo do arquivo .json baixado do Google Cloud Console</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Developer Token"
                    type="password"
                    value={googleApiDevToken}
                    onChange={e => setGoogleApiDevToken(e.target.value)}
                    placeholder="DeveloperToken..."
                    required
                  />
                  <FormInput
                    label="Customer ID"
                    type="text"
                    value={googleApiCustomerId}
                    onChange={e => setGoogleApiCustomerId(e.target.value)}
                    placeholder="169-854-9372"
                    required
                  />
                </div>

                <FormInput
                  label="Manager Account ID"
                  type="text"
                  value={googleApiManagerId}
                  onChange={e => setGoogleApiManagerId(e.target.value)}
                  placeholder="123-456-7890"
                  description="Opcional, se a conta esta sob uma MCC"
                />

                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={handleGoogleApiSave}
                  disabled={googleApiSaving || !googleApiJson.trim() || !googleApiDevToken.trim() || !googleApiCustomerId.trim()}
                  isLoading={googleApiSaving}
                  className="w-full"
                >
                  {googleApiSaving ? 'Salvando...' : 'Conectar e Salvar Credenciais'}
                </Button>
              </div>
            )}

            {googleApiMessage && (
              <div className={`p-3 rounded-lg text-sm font-medium ${msgClass(googleApiMessage.type)}`}>
                {googleApiMessage.text}
              </div>
            )}
          </FormSection>
        </div>
      </div>

      {/* ── SDR Upload ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
          <FormSection
            title="Importar Planilha SDR"
            description="Leads mensais · Qualificação · Vendas fechadas"
            icon={<Upload className="w-5 h-5" />}
          >
            <FileUpload
              label="Arquivo SDR"
              description=".xlsx · .xls · .csv"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onFileSelect={handleSdrUpload}
              selectedFile={sdrFile}
              error={sdrMessage?.type === 'error' ? sdrMessage.text : undefined}
            />

            {sdrMessage && sdrMessage.type === 'success' && (
              <div className={`p-3 rounded-lg text-sm font-medium ${msgClass(sdrMessage.type)}`}>
                {sdrMessage.text}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Formato: Mes · Leads · Qualificados · Vendas (resumo) + Cliente · Canal · Mes Entrada · Mes Fechamento · Mes da Viagem · Valor (detalhe)
            </p>
          </FormSection>
        </div>
      </div>

      {/* ── Google Ads CSV (fallback) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
          <FormSection
            title="Google Ads — Importar CSV"
            description="Alternativa manual quando a API não estiver configurada"
            icon={<BarChart3 className="w-5 h-5" />}
          >
            <FileUpload
              label="Arquivo CSV"
              description=".csv"
              accept=".csv,text/csv"
              onFileSelect={handleGoogleAdsUpload}
              selectedFile={googleFile}
              error={googleMessage?.type === 'error' ? googleMessage.text : undefined}
            />

            {googleMessage && googleMessage.type === 'success' && (
              <div className={`p-3 rounded-lg text-sm font-medium ${msgClass(googleMessage.type)}`}>
                {googleMessage.text}
              </div>
            )}

            {googleStatus.loaded && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ {googleStatus.months} {googleStatus.months === 1 ? 'mês' : 'meses'} carregado via {googleStatus.source === 'api' ? 'API' : 'CSV'}
                </p>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Baixe em Google Ads → Relatórios → selecione: Dia · Custo · Cliques · Impressões → Exportar CSV
            </p>
          </FormSection>
        </div>
      </div>

      {/* ── Pipedrive/Monde Upload ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
          <FormSection
            title="Importar Planilha Monde"
            description="Faturamento confirmado por Deal ID. Com Pipedrive direto sincronizado, esta planilha já basta para o cruzamento."
            icon={<Database className="w-5 h-5" />}
          >
            <FileUpload
              label="Arquivo Monde"
              description=".xlsx · .xls · .csv"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onFileSelect={handlePipedriveUpload}
              selectedFile={pipeFile}
              error={pipeMessage?.type === 'error' ? pipeMessage.text : undefined}
            />

            {pipeMessage && pipeMessage.type === 'success' && (
              <div className={`p-3 rounded-lg text-sm font-medium ${msgClass(pipeMessage.type)}`}>
                {pipeMessage.text}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Formato recomendado: Negócio ID ou Deal ID + Faturamento Total (R$). Canal, status e datas passam a vir do Pipedrive direto quando ele estiver sincronizado.
            </p>
          </FormSection>
        </div>
      </div>

      {/* Info note */}
      <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Dados importados são armazenados com segurança. A conta de serviço Google nunca expõe a chave privada em respostas de API.
          Você pode reimportar qualquer fonte a qualquer momento para atualizar os dados.
        </p>
      </div>
    </div>
  );
}
