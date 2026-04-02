'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface FormMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
}

export function FormMessage({ type, message, onDismiss }: FormMessageProps) {
  const styles = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: CheckCircle,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      icon: XCircle,
      iconColor: 'text-red-500 dark:text-red-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: AlertCircle,
      iconColor: 'text-amber-500 dark:text-amber-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: Info,
      iconColor: 'text-blue-500 dark:text-blue-400',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <p className={`text-sm font-medium ${style.text}`}>
        {message}
      </p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
