export const DATE_RANGE_EVENT = 'dashboard-date-range-change';

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 1);

  return { startDate, endDate };
}

export function getBrowserDateRange() {
  const defaults = getDefaultDateRange();

  if (typeof window === 'undefined') {
    return defaults;
  }

  const params = new URLSearchParams(window.location.search);
  return {
    startDate: parseDateInput(params.get('startDate')) || defaults.startDate,
    endDate: parseDateInput(params.get('endDate')) || defaults.endDate,
  };
}

export function writeBrowserDateRange(startDate: Date, endDate: Date) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('startDate', toDateInputValue(startDate));
  url.searchParams.set('endDate', toDateInputValue(endDate));
  window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  window.dispatchEvent(new CustomEvent(DATE_RANGE_EVENT));
}

export function withCurrentDateRange(href: string) {
  if (typeof window === 'undefined') {
    return href;
  }

  const currentParams = new URLSearchParams(window.location.search);
  const startDate = currentParams.get('startDate');
  const endDate = currentParams.get('endDate');

  if (!startDate || !endDate) {
    return href;
  }

  const url = new URL(href, window.location.origin);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  return `${url.pathname}?${url.searchParams.toString()}`;
}
