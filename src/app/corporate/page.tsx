'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3, DollarSign, Loader, RefreshCw, ShoppingCart, Store,
  TrendingDown, TrendingUp, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface OverviewResponse {
  connected: boolean;
  updatedAt: string | null;
  totals: {
    totalVendas: number;
    totalReceitas: number;
    totalFaturamento: number;
    ticketMedioReceita: number;
    ticketMedioFaturamento: number;
    vendedoresAtivos: number;
    clientesAtivos: number;
    growthReceita: number | null;
    growthVendas: number | null;
  } | null;
  monthly: Array<{ month: string; label: string; receitas: number; faturamento: number; vendas: number }>;
  topSellers: Array<{ key: string; receitas: number; faturamento: number; vendas: number; ticketMedio: number }>;
  topClients: Array<{ key: string; receitas: number; faturamento: number; vendas: number; ticketMedio: number }>;
  products: Array<{ key: string; receitas: number; faturamento: number; vendas: number; ticketMedio: number }>;
  profiles: Array<{ perfil: string; vendas: number; receitas: number }>;
  history: Array<{ date: string; receitas: number; faturamento: number; vendas: number }>;
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export default function CorporateOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/corporate/overview', { cache: 'no-store' });
      const json: OverviewResponse = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/corporate/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncMessage(`✅ ${json.recordsImported} vendas importadas`);
        await loadData();
      } else {
        setSyncMessage(`❌ ${json.error || 'Erro ao sincronizar'}`);
      }
    } catch (e) {
      setSyncMessage(`❌ ${(e as Error).message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const notConnected = !data?.connected || !data.totals;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/" className="hover:text-slate-700">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-700">Corporativo</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Corporativo</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Análise de vendas da agência · Fonte: Google Sheets
              {data?.updatedAt && (
                <span className="ml-2 text-slate-400">
                  · Última sincronização: {new Date(data.updatedAt).toLocaleString('pt-BR')}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncMessage && (
              <span className="text-sm text-slate-600">{syncMessage}</span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {notConnected ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900">Nenhum dado carregado</h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Clique em <strong>Sincronizar agora</strong> para importar os dados da planilha.
            </p>
            <p className="text-xs text-slate-400">
              A planilha precisa estar com acesso "Qualquer pessoa com o link pode visualizar".
            </p>
          </div>
        ) : (
          <>
            {/* Métricas principais */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total de vendas"
                value={fmtNumber(data!.totals!.totalVendas)}
                growth={data!.totals!.growthVendas}
                icon={<ShoppingCart className="w-5 h-5" />}
                color="blue"
              />
              <MetricCard
                label="Receita"
                value={fmtMoney(data!.totals!.totalReceitas)}
                growth={data!.totals!.growthReceita}
                icon={<DollarSign className="w-5 h-5" />}
                color="emerald"
              />
              <MetricCard
                label="Faturamento"
                value={fmtMoney(data!.totals!.totalFaturamento)}
                icon={<TrendingUp className="w-5 h-5" />}
                color="violet"
              />
              <MetricCard
                label="Ticket médio (receita)"
                value={fmtMoney(data!.totals!.ticketMedioReceita)}
                icon={<BarChart3 className="w-5 h-5" />}
                color="amber"
              />
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniStat label="Vendedores ativos" value={fmtNumber(data!.totals!.vendedoresAtivos)} icon={<Users className="w-4 h-4" />} />
              <MiniStat label="Clientes ativos" value={fmtNumber(data!.totals!.clientesAtivos)} icon={<Store className="w-4 h-4" />} />
              <MiniStat label="Ticket médio (faturamento)" value={fmtMoney(data!.totals!.ticketMedioFaturamento)} />
              <MiniStat label="Margem média" value={
                data!.totals!.totalFaturamento > 0
                  ? `${((data!.totals!.totalReceitas / data!.totals!.totalFaturamento) * 100).toFixed(1)}%`
                  : '—'
              } />
            </section>

            {/* Gráfico de tendência mensal */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Receita × Faturamento por mês</h2>
                  <p className="text-sm text-slate-500">Evolução mensal</p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => fmtMoney(v)} width={90} />
                    <Tooltip
                      formatter={(v: number) => fmtMoney(v)}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} name="Receita" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="faturamento" stroke="#3b82f6" strokeWidth={2} name="Faturamento" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Top Vendedores & Produtos */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Top Vendedores</h2>
                <p className="text-sm text-slate-500 mb-4">Por receita</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.topSellers.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: 90, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => fmtMoney(v)} />
                      <YAxis type="category" dataKey="key" stroke="#64748b" fontSize={12} width={80} />
                      <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="receitas" radius={[0, 8, 8, 0]}>
                        {data!.topSellers.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Produtos</h2>
                <p className="text-sm text-slate-500 mb-4">Participação na receita</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data!.products}
                        dataKey="receitas"
                        nameKey="key"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(entry) => entry.key}
                      >
                        {data!.products.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Top Clientes tabela */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Top 15 clientes</h2>
                <p className="text-sm text-slate-500">Ordenado por receita</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3 font-medium">Cliente</th>
                      <th className="px-6 py-3 font-medium text-right">Vendas</th>
                      <th className="px-6 py-3 font-medium text-right">Receita</th>
                      <th className="px-6 py-3 font-medium text-right">Faturamento</th>
                      <th className="px-6 py-3 font-medium text-right">Ticket médio</th>
                      <th className="px-6 py-3 font-medium text-right">% Receita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data!.topClients.map((c) => {
                      const pct = data!.totals!.totalReceitas > 0
                        ? (c.receitas / data!.totals!.totalReceitas) * 100
                        : 0;
                      return (
                        <tr key={c.key} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-900">{c.key}</td>
                          <td className="px-6 py-3 text-right text-slate-700">{fmtNumber(c.vendas)}</td>
                          <td className="px-6 py-3 text-right text-slate-700">{fmtMoney(c.receitas)}</td>
                          <td className="px-6 py-3 text-right text-slate-700">{fmtMoney(c.faturamento)}</td>
                          <td className="px-6 py-3 text-right text-slate-700">{fmtMoney(c.ticketMedio)}</td>
                          <td className="px-6 py-3 text-right text-slate-700">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Perfis comportamentais */}
            {data!.profiles.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Perfil de antecedência</h2>
                <p className="text-sm text-slate-500 mb-6">Distribuição entre Urgente (≤7d), Normal (≤30d) e Planejado (&gt;30d)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data!.profiles.map((p, i) => (
                    <div key={p.perfil} className="rounded-lg border border-slate-200 p-5" style={{ borderTopColor: PALETTE[i], borderTopWidth: 4 }}>
                      <p className="text-sm font-medium text-slate-600">{p.perfil}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{fmtNumber(p.vendas)}</p>
                      <p className="text-xs text-slate-500">vendas</p>
                      <p className="text-sm font-semibold text-slate-700 mt-3">{fmtMoney(p.receitas)}</p>
                      <p className="text-xs text-slate-500">em receita</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  label, value, growth, icon, color,
}: {
  label: string;
  value: string;
  growth?: number | null;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  const positive = growth != null && growth >= 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-3">{value}</p>
      {growth != null && (
        <div className="flex items-center gap-1 mt-2 text-xs font-medium">
          {positive
            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
          <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
            {fmtPct(growth)}
          </span>
          <span className="text-slate-400">vs 30d anteriores</span>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900 mt-2">{value}</p>
    </div>
  );
}
