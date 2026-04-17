import { NextRequest, NextResponse } from 'next/server';
import { type PipedriveDealRecord } from '@/lib/data-store';
import { buildPtBrDateLabel, resolveDateRange } from '@/lib/date-range';
import { getGoogleAdsDataForDateRange } from '@/lib/google-ads-store';
import { getMetaToken } from '@/lib/meta-token-store';
import { getSourceControls } from '@/lib/source-controls';
import { loadPipedriveDashboardData } from '@/lib/dashboard-snapshots';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MetaDailySpendRow {
  date_start?: string;
  spend?: string;
}

interface CohortMonthStats {
  monthKey: string;
  label: string;
  year: number;
  month: number;
  opportunities: number;
  sameMonthSales: number;
  sameMonthRevenue: number;
  totalSalesAnyMonth: number;
  totalRevenueAnyMonth: number;
  openDeals: number;
  investment: number;
  sameMonthCac: number | null;
  sameMonthConversionRate: number;
}

async function fetchMetaDailySpend(start: string, end: string): Promise<{ connected: boolean; spendByMonth: Map<string, number> }> {
  const metaToken = await getMetaToken();
  if (!metaToken?.token || !metaToken.accountId) {
    return { connected: false, spendByMonth: new Map() };
  }

  const spendByMonth = new Map<string, number>();
  let nextUrl: string | null = new URL(`https://graph.facebook.com/v20.0/${metaToken.accountId}/insights`).toString();
  let firstRequest = true;

  try {
    while (nextUrl) {
      const url = new URL(nextUrl);

      if (firstRequest) {
        url.searchParams.set('access_token', metaToken.token);
        url.searchParams.set('fields', 'date_start,spend');
        url.searchParams.set('time_increment', '1');
        url.searchParams.set('time_range', JSON.stringify({ since: start, until: end }));
        url.searchParams.set('limit', '1000');
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        const body = await response.text();
        console.error('Meta daily spend error:', body);
        return { connected: false, spendByMonth: new Map() };
      }

      const payload = await response.json() as {
        data?: MetaDailySpendRow[];
        paging?: { next?: string };
      };

      for (const row of payload.data || []) {
        const date = normalizeIsoDate(row.date_start || null);
        if (!date) {
          continue;
        }

        const monthKey = getMonthKey(date);
        const spend = Number.parseFloat(row.spend || '0') || 0;
        spendByMonth.set(monthKey, round2((spendByMonth.get(monthKey) || 0) + spend));
      }

      nextUrl = payload.paging?.next || null;
      firstRequest = false;
    }

    return { connected: true, spendByMonth };
  } catch (error) {
    console.error('Meta daily spend fetch failed:', error);
    return { connected: false, spendByMonth: new Map() };
  }
}

function normalizeIsoDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return null;
}

function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [yearStr, monthStr] = monthKey.split('-');
  return {
    year: Number.parseInt(yearStr, 10),
    month: Number.parseInt(monthStr, 10),
  };
}

function formatMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_ABBR[month - 1] || month}/${year}`;
}

function isInRange(date: string | null, start: string, end: string): boolean {
  if (!date) {
    return false;
  }

  return date >= start && date <= end;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildMonthStats(
  monthKey: string,
  opportunities: PipedriveDealRecord[],
  mondeById: Map<string, PipedriveDealRecord>,
  investment: number,
): CohortMonthStats {
  let sameMonthSales = 0;
  let sameMonthRevenue = 0;
  let totalSalesAnyMonth = 0;
  let totalRevenueAnyMonth = 0;

  for (const opportunity of opportunities) {
    const sale = mondeById.get(opportunity.id);
    if (!sale?.createdDate) {
      continue;
    }

    if (!isValidCohortSale(monthKey, sale.createdDate)) {
      continue;
    }

    totalSalesAnyMonth += 1;
    totalRevenueAnyMonth += sale.receita || 0;

    if (getMonthKey(sale.createdDate) === monthKey) {
      sameMonthSales += 1;
      sameMonthRevenue += sale.receita || 0;
    }
  }

  const { year, month } = parseMonthKey(monthKey);
  const opportunitiesCount = opportunities.length;
  const openDeals = opportunitiesCount - totalSalesAnyMonth;

  return {
    monthKey,
    label: formatMonthLabel(monthKey),
    year,
    month,
    opportunities: opportunitiesCount,
    sameMonthSales,
    sameMonthRevenue: round2(sameMonthRevenue),
    totalSalesAnyMonth,
    totalRevenueAnyMonth: round2(totalRevenueAnyMonth),
    openDeals,
    investment: round2(investment),
    sameMonthCac: sameMonthSales > 0 && investment > 0 ? round2(investment / sameMonthSales) : null,
    sameMonthConversionRate: opportunitiesCount > 0 ? round2((sameMonthSales / opportunitiesCount) * 100) : 0,
  };
}

function isValidCohortSale(entryMonthKey: string, saleDate: string): boolean {
  return getMonthKey(saleDate) >= entryMonthKey;
}

export async function GET(req: NextRequest) {
  try {
    const range = resolveDateRange(
      req.nextUrl.searchParams.get('start'),
      req.nextUrl.searchParams.get('end'),
      Number.parseInt(req.nextUrl.searchParams.get('period') || '30', 10),
    );

    const sourceControls = await getSourceControls();
    const pipedriveData = sourceControls.pipedriveEnabled ? await loadPipedriveDashboardData() : null;
    const pipelineDeals = Array.isArray(pipedriveData?.pipelineDeals) ? pipedriveData.pipelineDeals : [];
    const mondeDeals = Array.isArray(pipedriveData?.mondeDeals) ? pipedriveData.mondeDeals : [];

    if (pipelineDeals.length === 0) {
      return NextResponse.json({
        hasData: false,
        periodLabel: buildPtBrDateLabel(range),
        summary: null,
        monthly: [],
        matrix: { saleMonths: [], rows: [] },
      });
    }

    const filteredEntries = pipelineDeals.filter((deal) => isInRange(deal.createdDate, range.start, range.end));
    const mondeById = new Map<string, PipedriveDealRecord>(mondeDeals.map((deal) => [deal.id, deal]));
    const entriesByMonth = new Map<string, PipedriveDealRecord[]>();

    for (const deal of filteredEntries) {
      if (!deal.createdDate) {
        continue;
      }

      const monthKey = getMonthKey(deal.createdDate);
      const current = entriesByMonth.get(monthKey) || [];
      current.push(deal);
      entriesByMonth.set(monthKey, current);
    }

    const googleSpendByMonth = new Map<string, number>();
    if (sourceControls.googleAdsEnabled) {
      const googleData = await getGoogleAdsDataForDateRange(range.start, range.end);
      for (const dailyRow of googleData?.daily || []) {
        const monthKey = getMonthKey(dailyRow.date);
        googleSpendByMonth.set(monthKey, round2((googleSpendByMonth.get(monthKey) || 0) + dailyRow.spend));
      }
    }

    const metaSpendData = await fetchMetaDailySpend(range.start, range.end);
    const saleMonthsSet = new Set<string>();
    const monthly = Array.from(entriesByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, opportunities]) => {
        for (const opportunity of opportunities) {
          const sale = mondeById.get(opportunity.id);
          if (sale?.createdDate && isValidCohortSale(monthKey, sale.createdDate)) {
            saleMonthsSet.add(getMonthKey(sale.createdDate));
          }
        }

        const totalInvestment = (googleSpendByMonth.get(monthKey) || 0) + (metaSpendData.spendByMonth.get(monthKey) || 0);
        return buildMonthStats(monthKey, opportunities, mondeById, totalInvestment);
      });

    const saleMonths = Array.from(saleMonthsSet)
      .sort((a, b) => a.localeCompare(b))
      .map((monthKey) => ({ monthKey, label: formatMonthLabel(monthKey) }));

    const matrixRows = monthly.map((monthStat) => {
      const opportunities = entriesByMonth.get(monthStat.monthKey) || [];
      const cellMap = new Map<string, { sales: number; revenue: number }>();

      for (const opportunity of opportunities) {
        const sale = mondeById.get(opportunity.id);
        if (!sale?.createdDate) {
          continue;
        }

        if (!isValidCohortSale(monthStat.monthKey, sale.createdDate)) {
          continue;
        }

        const saleMonthKey = getMonthKey(sale.createdDate);
        const current = cellMap.get(saleMonthKey) || { sales: 0, revenue: 0 };
        current.sales += 1;
        current.revenue = round2(current.revenue + (sale.receita || 0));
        cellMap.set(saleMonthKey, current);
      }

      return {
        entryMonthKey: monthStat.monthKey,
        label: monthStat.label,
        opportunities: monthStat.opportunities,
        soldAnyMonth: monthStat.totalSalesAnyMonth,
        unsold: monthStat.openDeals,
        cells: saleMonths.map((saleMonth) => ({
          monthKey: saleMonth.monthKey,
          sales: cellMap.get(saleMonth.monthKey)?.sales || 0,
          revenue: round2(cellMap.get(saleMonth.monthKey)?.revenue || 0),
        })),
      };
    });

    const summary = monthly.reduce(
      (acc, item) => {
        acc.entryDeals += item.opportunities;
        acc.sameMonthSales += item.sameMonthSales;
        acc.sameMonthRevenue = round2(acc.sameMonthRevenue + item.sameMonthRevenue);
        acc.totalInvestment = round2(acc.totalInvestment + item.investment);
        return acc;
      },
      { entryDeals: 0, sameMonthSales: 0, sameMonthRevenue: 0, totalInvestment: 0 },
    );

    return NextResponse.json({
      hasData: monthly.length > 0,
      periodLabel: buildPtBrDateLabel(range),
      investmentSources: {
        metaConnected: metaSpendData.connected,
        googleConnected: sourceControls.googleAdsEnabled,
      },
      summary: {
        ...summary,
        trackedEntryMonths: monthly.length,
        sameMonthCac: summary.sameMonthSales > 0 && summary.totalInvestment > 0
          ? round2(summary.totalInvestment / summary.sameMonthSales)
          : null,
        sameMonthConversionRate: summary.entryDeals > 0
          ? round2((summary.sameMonthSales / summary.entryDeals) * 100)
          : 0,
      },
      monthly,
      matrix: {
        saleMonths,
        rows: matrixRows,
      },
    });
  } catch (error) {
    console.error('Cohorts error:', error);
    return NextResponse.json({ error: 'Erro ao calcular coortes' }, { status: 500 });
  }
}
