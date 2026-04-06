import { blobDel, blobGetJson, blobSetJson } from '@/lib/storage';

const MONTH_PT: Record<number, string> = {
  1: 'janeiro',
  2: 'fevereiro',
  3: 'marco',
  4: 'abril',
  5: 'maio',
  6: 'junho',
  7: 'julho',
  8: 'agosto',
  9: 'setembro',
  10: 'outubro',
  11: 'novembro',
  12: 'dezembro',
};

export interface GoogleAdsMonth {
  month: string;
  year: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GoogleAdsCampaign {
  campaignId: string;
  campaignName: string;
  channelType?: string;
  channelSubType?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GoogleAdsDailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GoogleAdsDailyCampaignMetric extends GoogleAdsDailyMetric {
  campaignId: string;
  campaignName: string;
  channelType?: string;
  channelSubType?: string | null;
}

export interface GoogleAdsStoredData {
  updatedAt: string;
  source?: string;
  apiVersion?: string;
  customerId: string;
  accountName: string;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  months: GoogleAdsMonth[];
  campaigns: GoogleAdsCampaign[];
  daily?: GoogleAdsDailyMetric[];
  dailyCampaigns?: GoogleAdsDailyCampaignMetric[];
}

export interface GoogleAdsPeriodData extends GoogleAdsStoredData {
  monthsCount: number;
  campaignsCount: number;
  periodDays: number | null;
  channelBreakdown: Array<{
    channelType: string;
    channelSubType: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    campaigns: number;
  }>;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildMonthKey(date: string): { key: string; month: string; year: number } {
  const [yearStr, monthStr] = date.split('-');
  const year = Number.parseInt(yearStr, 10);
  const monthNum = Number.parseInt(monthStr, 10);
  return {
    key: `${year}-${String(monthNum).padStart(2, '0')}`,
    month: MONTH_PT[monthNum] || `mes-${monthNum}`,
    year,
  };
}

function getCutoffDate(periodDays: number): Date {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (periodDays - 1));
  return cutoff;
}

function filterDailyRowsByRange<T extends { date: string }>(rows: T[], start: string, end: string): T[] {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);

  return rows.filter((row) => {
    const date = new Date(`${row.date}T00:00:00`);
    return date >= startDate && date <= endDate;
  });
}

function filterDailyRows<T extends { date: string }>(rows: T[], periodDays: number): T[] {
  const cutoff = getCutoffDate(periodDays);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return rows.filter((row) => {
    const date = new Date(`${row.date}T00:00:00`);
    return date >= cutoff && date <= today;
  });
}

function aggregateMonths(rows: GoogleAdsDailyMetric[]): GoogleAdsMonth[] {
  const monthMap = new Map<string, GoogleAdsMonth>();

  for (const row of rows) {
    const monthInfo = buildMonthKey(row.date);
    const entry = monthMap.get(monthInfo.key) || {
      month: monthInfo.month,
      year: monthInfo.year,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };

    monthMap.set(monthInfo.key, {
      ...entry,
      spend: roundCurrency(entry.spend + row.spend),
      impressions: entry.impressions + row.impressions,
      clicks: entry.clicks + row.clicks,
      conversions: entry.conversions + row.conversions,
    });
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);
}

function aggregateCampaigns(rows: GoogleAdsDailyCampaignMetric[]): GoogleAdsCampaign[] {
  const campaignMap = new Map<string, GoogleAdsCampaign>();

  for (const row of rows) {
    const entry = campaignMap.get(row.campaignId) || {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      channelType: row.channelType || 'UNKNOWN',
      channelSubType: row.channelSubType || null,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };

    campaignMap.set(row.campaignId, {
      ...entry,
      channelType: row.channelType || entry.channelType || 'UNKNOWN',
      channelSubType: row.channelSubType || entry.channelSubType || null,
      spend: roundCurrency(entry.spend + row.spend),
      impressions: entry.impressions + row.impressions,
      clicks: entry.clicks + row.clicks,
      conversions: entry.conversions + row.conversions,
    });
  }

  return Array.from(campaignMap.values()).sort((a, b) => b.spend - a.spend);
}

function buildChannelBreakdown(campaigns: GoogleAdsCampaign[]) {
  const breakdownMap = new Map<
    string,
    {
      channelType: string;
      channelSubType: string | null;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      campaigns: number;
    }
  >();

  for (const campaign of campaigns) {
    const channelType = campaign.channelType || 'UNKNOWN';
    const channelSubType = campaign.channelSubType || null;
    const key = `${channelType}:${channelSubType || ''}`;
    const entry = breakdownMap.get(key) || {
      channelType,
      channelSubType,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      campaigns: 0,
    };

    breakdownMap.set(key, {
      ...entry,
      spend: roundCurrency(entry.spend + campaign.spend),
      impressions: entry.impressions + campaign.impressions,
      clicks: entry.clicks + campaign.clicks,
      conversions: entry.conversions + campaign.conversions,
      campaigns: entry.campaigns + 1,
    });
  }

  return Array.from(breakdownMap.values()).sort((a, b) => b.spend - a.spend);
}

export async function setGoogleAdsStoredData(data: GoogleAdsStoredData): Promise<void> {
  await blobSetJson('google-ads-data', data);
}

export async function clearGoogleAdsStoredData(): Promise<void> {
  await blobDel('google-ads-data');
}

export async function getGoogleAdsStoredData(): Promise<GoogleAdsStoredData | null> {
  return blobGetJson<GoogleAdsStoredData>('google-ads-data');
}

export async function getGoogleAdsDataForPeriod(periodDays?: number | null): Promise<GoogleAdsPeriodData | null> {
  const stored = await getGoogleAdsStoredData();

  if (!stored) {
    return null;
  }

  if (!periodDays || !stored.daily || stored.daily.length === 0) {
    return {
      ...stored,
      monthsCount: stored.months.length,
      campaignsCount: stored.campaigns.length,
      periodDays: periodDays ?? null,
      channelBreakdown: buildChannelBreakdown(stored.campaigns),
    };
  }

  const filteredDaily = filterDailyRows(stored.daily, periodDays);
  const filteredDailyCampaigns = filterDailyRows(stored.dailyCampaigns || [], periodDays);
  const months = aggregateMonths(filteredDaily);
  const campaigns = aggregateCampaigns(filteredDailyCampaigns);
  const totalSpend = roundCurrency(filteredDaily.reduce((sum, row) => sum + row.spend, 0));
  const totalImpressions = filteredDaily.reduce((sum, row) => sum + row.impressions, 0);
  const totalClicks = filteredDaily.reduce((sum, row) => sum + row.clicks, 0);
  const totalConversions = filteredDaily.reduce((sum, row) => sum + row.conversions, 0);

  return {
    ...stored,
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions,
    months,
    campaigns,
    daily: filteredDaily,
    dailyCampaigns: filteredDailyCampaigns,
    monthsCount: months.length,
    campaignsCount: campaigns.length,
    periodDays,
    channelBreakdown: buildChannelBreakdown(campaigns),
  };
}

export async function getGoogleAdsDataForDateRange(start: string, end: string): Promise<GoogleAdsPeriodData | null> {
  const stored = await getGoogleAdsStoredData();

  if (!stored) {
    return null;
  }

  if (!stored.daily || stored.daily.length === 0) {
    return {
      ...stored,
      monthsCount: stored.months.length,
      campaignsCount: stored.campaigns.length,
      periodDays: null,
      channelBreakdown: buildChannelBreakdown(stored.campaigns),
    };
  }

  const filteredDaily = filterDailyRowsByRange(stored.daily, start, end);
  const filteredDailyCampaigns = filterDailyRowsByRange(stored.dailyCampaigns || [], start, end);
  const months = aggregateMonths(filteredDaily);
  const campaigns = aggregateCampaigns(filteredDailyCampaigns);
  const totalSpend = roundCurrency(filteredDaily.reduce((sum, row) => sum + row.spend, 0));
  const totalImpressions = filteredDaily.reduce((sum, row) => sum + row.impressions, 0);
  const totalClicks = filteredDaily.reduce((sum, row) => sum + row.clicks, 0);
  const totalConversions = filteredDaily.reduce((sum, row) => sum + row.conversions, 0);

  return {
    ...stored,
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions,
    months,
    campaigns,
    monthsCount: months.length,
    campaignsCount: campaigns.length,
    periodDays: null,
    channelBreakdown: buildChannelBreakdown(campaigns),
  };
}
