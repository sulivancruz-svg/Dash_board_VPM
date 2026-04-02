export interface DateRange {
  start: string;
  end: string;
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPresetDateRange(days: number): DateRange {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    start: formatIsoDate(start),
    end: formatIsoDate(end),
  };
}

export function resolveDateRange(
  startParam: string | null,
  endParam: string | null,
  fallbackDays = 30,
): DateRange & { periodDays: number } {
  const fallback = getPresetDateRange(fallbackDays);
  const startDate = parseIsoDate(startParam) || parseIsoDate(fallback.start)!;
  const endDate = parseIsoDate(endParam) || parseIsoDate(fallback.end)!;

  if (startDate > endDate) {
    return {
      ...fallback,
      periodDays: fallbackDays,
    };
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const periodDays = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);

  return {
    start: formatIsoDate(startDate),
    end: formatIsoDate(endDate),
    periodDays,
  };
}

export function buildPtBrDateLabel(range: DateRange): string {
  const start = parseIsoDate(range.start);
  const end = parseIsoDate(range.end);

  if (!start || !end) {
    return '';
  }

  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
}
