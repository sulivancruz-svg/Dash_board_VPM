/**
 * Design System Tokens
 * Semantic color & component tokens for consistent UI
 */

export const semanticColors = {
  status: {
    success: {
      bg: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-950',
      text: 'text-emerald-700',
      textDark: 'dark:text-emerald-300',
      border: 'border-emerald-200',
      borderDark: 'dark:border-emerald-800',
      icon: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50',
      bgDark: 'dark:bg-amber-950',
      text: 'text-amber-700',
      textDark: 'dark:text-amber-300',
      border: 'border-amber-200',
      borderDark: 'dark:border-amber-800',
      icon: 'text-amber-600',
    },
    critical: {
      bg: 'bg-red-50',
      bgDark: 'dark:bg-red-950',
      text: 'text-red-700',
      textDark: 'dark:text-red-300',
      border: 'border-red-200',
      borderDark: 'dark:border-red-800',
      icon: 'text-red-600',
    },
    info: {
      bg: 'bg-blue-50',
      bgDark: 'dark:bg-blue-950',
      text: 'text-blue-700',
      textDark: 'dark:text-blue-300',
      border: 'border-blue-200',
      borderDark: 'dark:border-blue-800',
      icon: 'text-blue-600',
    },
  },
};

export const kpiTokens = {
  card: {
    base: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm',
    hover: 'hover:shadow-md dark:hover:shadow-lg transition-shadow duration-200 motion-safe:hover:shadow-md',
    accentBar: {
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      critical: 'bg-red-500',
      info: 'bg-blue-500',
      neutral: 'bg-slate-300',
    },
  },
};

export const textColors = {
  label: 'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider',
  value: 'text-2xl font-bold text-slate-900 dark:text-white tabular-nums',
  secondary: 'text-sm text-slate-600 dark:text-slate-300',
  tertiary: 'text-xs text-slate-500 dark:text-slate-400',
};

export const buttonTokens = {
  base: 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
  sizes: {
    sm: 'px-3 py-2 text-sm h-9 min-w-9',
    md: 'px-4 py-2.5 text-sm h-10 min-w-10',
    lg: 'px-5 py-3 text-base h-11 min-w-11',
  },
  states: {
    primary: 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 active:scale-98 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed',
  },
};

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:focus-visible:outline-blue-400';

export const touchTarget = 'min-h-11 min-w-11'; // 44×44px minimum
