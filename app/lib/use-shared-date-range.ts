'use client';

import { useCallback, useEffect, useState } from 'react';
import { DATE_RANGE_EVENT, getBrowserDateRange } from '@/lib/date-range';

export function useSharedDateRange() {
  const [range, setRange] = useState(() => getBrowserDateRange());

  useEffect(() => {
    const syncFromUrl = () => setRange(getBrowserDateRange());
    syncFromUrl();
    window.addEventListener(DATE_RANGE_EVENT, syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);

    return () => {
      window.removeEventListener(DATE_RANGE_EVENT, syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  const setDateRange = useCallback((startDate: Date, endDate: Date) => {
    setRange({ startDate, endDate });
  }, []);

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    setDateRange,
  };
}
