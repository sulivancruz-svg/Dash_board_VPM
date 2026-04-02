'use client';

import React from 'react';
import { Button } from '@/components/button';
import { KpiCard } from '@/components/kpi-card';
import { AlertPanel } from '@/components/alert-panel';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import type { Alert } from '@/components/alert-panel';

export default function DesignSystemPage() {
  const sampleAlerts: Alert[] = [
    {
      id: '1',
      severity: 'CRITICAL',
      message: '65% dos deals sem faturamento',
      action: 'Verificar no Pipedrive',
    },
    {
      id: '2',
      severity: 'WARNING',
      message: 'ROI caindo 12% esta semana',
      action: 'Revisar estrategia',
    },
    {
      id: '3',
      severity: 'INFO',
      message: 'Google Ads com melhor performance',
      action: 'Aumentar investimento',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Design System</h1>
          <p className="text-slate-600 dark:text-slate-400">Componentes acessíveis e responsivos</p>
        </div>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Botões</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="sm">Pequeno</Button>
            <Button variant="primary" size="md">Médio</Button>
            <Button variant="primary" size="lg">Grande</Button>
            <Button variant="secondary" size="md">Secundário</Button>
            <Button variant="danger" size="md">Perigo</Button>
            <Button disabled size="md">Desabilitado</Button>
            <Button isLoading size="md">Carregando</Button>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">KPI Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              label="Receita"
              value={45000}
              format="currency"
              Icon={BarChart3}
              accentColor="success"
              delta={{ value: 12.5, direction: 'up' }}
            />
            <KpiCard
              label="Impressões"
              value={1250000}
              format="number"
              Icon={TrendingUp}
              accentColor="info"
              delta={{ value: 8.2, direction: 'up' }}
            />
            <KpiCard
              label="CTR"
              value={2.45}
              format="percentage"
              Icon={AlertCircle}
              accentColor="warning"
              delta={{ value: 0.3, direction: 'down' }}
            />
            <KpiCard
              label="Conversões"
              value={156}
              format="number"
              Icon={BarChart3}
              accentColor="critical"
              delta={{ value: 5.1, direction: 'down' }}
            />
          </div>
        </section>

        {/* Alert Panel */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Alertas</h2>
          <AlertPanel alerts={sampleAlerts} />
          <AlertPanel alerts={[]} />
        </section>

        {/* Color Palette */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Paleta de Cores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-20 bg-emerald-500 rounded-lg" />
              <p className="text-sm font-medium">Success</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Emerald-500</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-amber-500 rounded-lg" />
              <p className="text-sm font-medium">Warning</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Amber-500</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-red-500 rounded-lg" />
              <p className="text-sm font-medium">Critical</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Red-500</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-blue-500 rounded-lg" />
              <p className="text-sm font-medium">Info</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Blue-500</p>
            </div>
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Acessibilidade</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">✅ WCAG 2.1 AA</p>
              <p className="text-sm">Todos os componentes seguem padrões WCAG</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">✅ Keyboard Navigation</p>
              <p className="text-sm">Tab para navegar, Enter para ativar, Escape para fechar</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">✅ Screen Readers</p>
              <p className="text-sm">ARIA labels, roles e live regions</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">✅ Reduced Motion</p>
              <p className="text-sm">Respeita prefers-reduced-motion</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">✅ Dark Mode</p>
              <p className="text-sm">Suporte completo para dark mode</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">✅ Touch Targets</p>
              <p className="text-sm">Mínimo 44×44px para elementos interativos</p>
            </div>
          </div>
        </section>

        {/* Focus Ring Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Focus Ring (teste com Tab)</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Clique e use Tab"
              className="px-3 py-2 border rounded-lg outline-blue-500 outline-offset-2"
            />
            <Button>Teste Focus</Button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pressione Tab para ver o focus ring azul em volta dos elementos
          </p>
        </section>
      </div>
    </div>
  );
}
