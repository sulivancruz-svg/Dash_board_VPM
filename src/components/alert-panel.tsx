'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { semanticColors, textColors } from '@/lib/design-tokens';

export interface Alert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  message: string;
  action?: string;
}

interface AlertPanelProps {
  alerts: Alert[];
}

const severityIcons = {
  CRITICAL: AlertCircle,
  WARNING: AlertTriangle,
  INFO: Lightbulb,
  SUCCESS: CheckCircle2,
};

const severityConfig = {
  CRITICAL: {
    badge: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200',
    label: 'Crítico',
  },
  WARNING: {
    badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200',
    label: 'Atenção',
  },
  INFO: {
    badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
    label: 'Info',
  },
  SUCCESS: {
    badge: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200',
    label: 'Sucesso',
  },
};

export function AlertPanel({ alerts }: AlertPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className={`${semanticColors.status.success.bg} ${semanticColors.status.success.bgDark} border ${semanticColors.status.success.border} ${semanticColors.status.success.borderDark} rounded-xl p-4 text-sm ${semanticColors.status.success.text} ${semanticColors.status.success.textDark} text-center flex items-center justify-center gap-2`}>
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span>Nenhum alerta no período</span>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="region" aria-label="Alertas e avisos">
      {alerts.map(alert => {
        const colors = semanticColors.status[alert.severity.toLowerCase() as keyof typeof semanticColors.status];
        const config = severityConfig[alert.severity];
        const Icon = severityIcons[alert.severity];

        return (
          <div
            key={alert.id}
            className={`${colors.bg} ${colors.bgDark} border ${colors.border} ${colors.borderDark} rounded-xl p-4 transition-all duration-200`}
            role="alert"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-5 h-5 ${colors.icon}`} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
                    {config.label}
                  </span>
                </div>
                <p className={`text-sm font-medium ${colors.text} ${colors.textDark}`}>{alert.message}</p>
                {alert.action && (
                  <p className={`text-xs ${textColors.tertiary} mt-1`}>→ {alert.action}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
