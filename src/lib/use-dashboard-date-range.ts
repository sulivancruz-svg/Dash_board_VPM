'use client';

import { useEffect, useState } from 'react';
import { getPresetDateRange } from '@/lib/date-range';

const STORAGE_KEY = 'dashboard-date-range';
const EVENT_NAME = 'dashboard-date-range-change';

export interface DashboardDateRangeState {
  activePeriod: string;
  dateRange: {
    start: string;
    end: string;
  };
}

const DEFAULT_STATE: DashboardDateRangeState = {
  activePeriod: '30',
  dateRange: getPresetDateRange(30),
};

function readStoredState(): DashboardDateRangeState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<DashboardDateRangeState>;
    return {
      activePeriod: parsed.activePeriod || DEFAULT_STATE.activePeriod,
      dateRange: {
        start: parsed.dateRange?.start || DEFAULT_STATE.dateRange.start,
        end: parsed.dateRange?.end || DEFAULT_STATE.dateRange.end,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(nextState: DashboardDateRangeState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: nextState }));
}

export function useDashboardDateRange() {
  const [state, setState] = useState<DashboardDateRangeState>(DEFAULT_STATE);

  useEffect(() => {
    setState(readStoredState());

    const syncFromStorage = () => setState(readStoredState());
    const syncFromCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<DashboardDateRangeState>;
      if (customEvent.detail) {
        setState(customEvent.detail);
      } else {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(EVENT_NAME, syncFromCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(EVENT_NAME, syncFromCustomEvent as EventListener);
    };
  }, []);

  const setPresetPeriod = (period: string) => {
    const nextState: DashboardDateRangeState = {
      activePeriod: period,
      dateRange: getPresetDateRange(Number.parseInt(period, 10)),
    };
    setState(nextState);
    persistState(nextState);
  };

  const setCustomDateRange = (nextRange: { start: string; end: string }) => {
    const nextState: DashboardDateRangeState = {
      activePeriod: 'custom',
      dateRange: nextRange,
    };
    setState(nextState);
    persistState(nextState);
  };

  return {
    activePeriod: state.activePeriod,
    dateRange: state.dateRange,
    setPresetPeriod,
    setCustomDateRange,
  };
}
