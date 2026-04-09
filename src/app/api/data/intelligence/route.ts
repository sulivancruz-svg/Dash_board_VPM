import { NextResponse } from 'next/server';
import { getPipedriveData, getSdrData } from '@/lib/data-store';
import { blobGetJson } from '@/lib/storage';
import { attributeChannel } from '@/lib/channel-mapping';
import type { GoogleAdsStoredData } from '@/lib/google-ads-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Helpers estatísticos ──────────────────────────────────────────────────────

function calcStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  return { mean, stdDev: Math.sqrt(variance) };
}

function zScore(value: number, mean: number, stdDev: number) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function anomalyStatus(z: number): 'ok' | 'warning' | 'anomaly' {
  const abs = Math.abs(z);
  if (abs > 2) return 'anomaly';
  if (abs > 1.2) return 'warning';
  return 'ok';
}

// ── Tipos de retorno ──────────────────────────────────────────────────────────

export interface MetricSeries {
  label: string;
  unit: 'currency' | 'number' | 'percent';
  series: Array<{ monthKey: string; label: string; value: number }>;
  mean: number;
  stdDev: number;
  latest: number;
  latestLabel: string;
  zScore: number;
  status: 'ok' | 'warning' | 'anomaly';
  direction: 'up' | 'down' | 'stable'; // em relação à média
  changeVsMean: number; // % de desvio em relação à média
}

export interface CohortRow {
  monthKey: string;
  month: string;
  year: number;
  receita: number;
  deals: number;
  ticketMedio: number;
  channels: Array<{
    canal: string;
    attribution: string;
    receita: number;
    deals: number;
    ticketMedio: number;
  }>;
}

export interface ChannelCohort {
  canal: string;
  attribution: string;
  totalReceita: number;
  totalDeals: number;
  ticketMedio: number;
  pctReceita: number;
  months: Array<{ monthKey: string; label: string; receita: number; deals: number }>;
  trend: 'growing' | 'declining' | 'stable'; // comparando último mês com média
  trendPct: number;
}

export interface IntelligenceData {
  updatedAt: string;
  hasData: boolean;

  // Cohort Analysis
  cohorts: {
    byMonth: CohortRow[];
    byChannel: ChannelCohort[];
    totalMonths: number;
    topChannel: string | null;
    topChannelTicket: number;
  };

  // Anomaly Detection
  anomalies: {
    metrics: MetricSeries[];
    alerts: Array<{
      metric: string;
      severity: 'warning' | 'critical';
      message: string;
      value: number;
      mean: number;
      zScore: number;
    }>;
    totalAlerts: number;
  };
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [pipedriveData, sdrData, googleAdsData] = await Promise.all([
      getPipedriveData(),
      getSdrData(),
      blobGetJson<GoogleAdsStoredData>('google-ads-data'),
    ]);

    if (!pipedriveData && !sdrData) {
      return NextResponse.json({
        updatedAt: new Date().toISOString(),
        hasData: false,
        cohorts: { byMonth: [], byChannel: [], totalMonths: 0, topChannel: null, topChannelTicket: 0 },
        anomalies: { metrics: [], alerts: [], totalAlerts: 0 },
      } as IntelligenceData);
    }

    // ── COHORT ANALYSIS ────────────────────────────────────────────────────────
    // Estratégia: se tiver deals individuais, usa granularidade total.
    // Senão, cruza monthly + channels por estimativa proporcional.

    const allDeals = [
      ...(pipedriveData?.pipelineDeals || []),
      ...(pipedriveData?.mondeDeals || []),
    ].filter(d => d.receita > 0 && d.createdDate);

    // Deduplicar por ID
    const seen = new Set<string>();
    const uniqueDeals = allDeals.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });

    const cohortMap = new Map<string, {
      monthKey: string; month: string; year: number;
      receita: number; deals: number;
      channelMap: Map<string, { receita: number; deals: number }>;
    }>();

    if (uniqueDeals.length > 0) {
      // Modo granular: um deal por linha
      for (const deal of uniqueDeals) {
        const raw = deal.createdDate!;
        const monthKey = raw.substring(0, 7); // "2026-01"
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthStr);
        const monthNames = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const month = monthNames[monthNum] || monthStr;

        if (!cohortMap.has(monthKey)) {
          cohortMap.set(monthKey, { monthKey, month, year, receita: 0, deals: 0, channelMap: new Map() });
        }
        const cohort = cohortMap.get(monthKey)!;
        cohort.receita += deal.receita;
        cohort.deals += 1;

        const canal = deal.canal || 'Não informado';
        const ch = cohort.channelMap.get(canal) || { receita: 0, deals: 0 };
        ch.receita += deal.receita;
        ch.deals += 1;
        cohort.channelMap.set(canal, ch);
      }
    } else {
      // Fallback: usa monthly do Pipedrive
      for (const m of (pipedriveData?.monthly || [])) {
        if (!cohortMap.has(m.monthKey)) {
          cohortMap.set(m.monthKey, {
            monthKey: m.monthKey,
            month: m.month,
            year: m.year,
            receita: m.receita,
            deals: m.deals,
            channelMap: new Map(),
          });
        }
      }
      // Distribui channels proporcionalmente por mês (estimativa)
      const totalRevenue = pipedriveData?.totalRevenue || 0;
      const channels = pipedriveData?.channels || [];
      for (const [, cohort] of cohortMap) {
        const monthPct = totalRevenue > 0 ? cohort.receita / totalRevenue : 0;
        for (const ch of channels) {
          const chRevenue = ch.receita * monthPct;
          const chDeals = Math.round(ch.vendas * monthPct);
          if (chRevenue > 0) {
            cohort.channelMap.set(ch.canal, { receita: chRevenue, deals: chDeals });
          }
        }
      }
    }

    // Ordena por monthKey crescente
    const sortedCohorts = Array.from(cohortMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    );

    const byMonth: CohortRow[] = sortedCohorts.map(c => ({
      monthKey: c.monthKey,
      month: c.month,
      year: c.year,
      receita: Math.round(c.receita * 100) / 100,
      deals: c.deals,
      ticketMedio: c.deals > 0 ? Math.round(c.receita / c.deals) : 0,
      channels: Array.from(c.channelMap.entries())
        .map(([canal, data]) => ({
          canal,
          attribution: attributeChannel(canal),
          receita: Math.round(data.receita * 100) / 100,
          deals: data.deals,
          ticketMedio: data.deals > 0 ? Math.round(data.receita / data.deals) : 0,
        }))
        .sort((a, b) => b.receita - a.receita),
    }));

    // Agrupa por canal (byChannel)
    const channelTotals = new Map<string, {
      canal: string;
      attribution: string;
      totalReceita: number;
      totalDeals: number;
      months: Map<string, { monthKey: string; label: string; receita: number; deals: number }>;
    }>();

    for (const cohort of byMonth) {
      for (const ch of cohort.channels) {
        if (!channelTotals.has(ch.canal)) {
          channelTotals.set(ch.canal, {
            canal: ch.canal,
            attribution: ch.attribution,
            totalReceita: 0,
            totalDeals: 0,
            months: new Map(),
          });
        }
        const ct = channelTotals.get(ch.canal)!;
        ct.totalReceita += ch.receita;
        ct.totalDeals += ch.deals;
        ct.months.set(cohort.monthKey, {
          monthKey: cohort.monthKey,
          label: `${cohort.month}/${cohort.year}`,
          receita: ch.receita,
          deals: ch.deals,
        });
      }
    }

    const grandTotal = Array.from(channelTotals.values()).reduce((s, c) => s + c.totalReceita, 0);

    const byChannel: ChannelCohort[] = Array.from(channelTotals.values())
      .map(ct => {
        const monthsArr = Array.from(ct.months.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
        const revenues = monthsArr.map(m => m.receita);
        const { mean } = calcStats(revenues);
        const latestRev = revenues[revenues.length - 1] ?? 0;
        const trendPct = mean > 0 ? Math.round(((latestRev - mean) / mean) * 100) : 0;
        const trend: ChannelCohort['trend'] = Math.abs(trendPct) <= 10 ? 'stable' : trendPct > 0 ? 'growing' : 'declining';

        return {
          canal: ct.canal,
          attribution: ct.attribution,
          totalReceita: Math.round(ct.totalReceita * 100) / 100,
          totalDeals: ct.totalDeals,
          ticketMedio: ct.totalDeals > 0 ? Math.round(ct.totalReceita / ct.totalDeals) : 0,
          pctReceita: grandTotal > 0 ? Math.round((ct.totalReceita / grandTotal) * 1000) / 10 : 0,
          months: monthsArr,
          trend,
          trendPct,
        };
      })
      .sort((a, b) => b.totalReceita - a.totalReceita);

    const topChannel = byChannel[0] ?? null;

    // ── ANOMALY DETECTION ──────────────────────────────────────────────────────

    const metrics: MetricSeries[] = [];

    // 1. Receita Mensal (Pipedrive monthly)
    if (pipedriveData?.monthly && pipedriveData.monthly.length >= 3) {
      const series = [...pipedriveData.monthly].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      const values = series.map(m => m.receita);
      const { mean, stdDev } = calcStats(values);
      const latest = values[values.length - 1] ?? 0;
      const z = zScore(latest, mean, stdDev);
      const changeVsMean = mean > 0 ? Math.round(((latest - mean) / mean) * 100) : 0;

      metrics.push({
        label: 'Receita Mensal',
        unit: 'currency',
        series: series.map(m => ({ monthKey: m.monthKey, label: `${m.month}/${m.year}`, value: m.receita })),
        mean: Math.round(mean),
        stdDev: Math.round(stdDev),
        latest: Math.round(latest),
        latestLabel: `${series[series.length - 1].month}/${series[series.length - 1].year}`,
        zScore: Math.round(z * 100) / 100,
        status: anomalyStatus(z),
        direction: latest >= mean ? 'up' : 'down',
        changeVsMean,
      });
    }

    // 2. Deals Fechados por Mês (Pipedrive monthly)
    if (pipedriveData?.monthly && pipedriveData.monthly.length >= 3) {
      const series = [...pipedriveData.monthly].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      const values = series.map(m => m.deals);
      const { mean, stdDev } = calcStats(values);
      const latest = values[values.length - 1] ?? 0;
      const z = zScore(latest, mean, stdDev);
      const changeVsMean = mean > 0 ? Math.round(((latest - mean) / mean) * 100) : 0;

      metrics.push({
        label: 'Deals Fechados',
        unit: 'number',
        series: series.map(m => ({ monthKey: m.monthKey, label: `${m.month}/${m.year}`, value: m.deals })),
        mean: Math.round(mean * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        latest,
        latestLabel: `${series[series.length - 1].month}/${series[series.length - 1].year}`,
        zScore: Math.round(z * 100) / 100,
        status: anomalyStatus(z),
        direction: latest >= mean ? 'up' : 'down',
        changeVsMean,
      });
    }

    // 3. Leads SDR por Mês
    if (sdrData?.months && sdrData.months.length >= 3) {
      const series = sdrData.months.slice(-12); // últimos 12 meses
      const values = series.map(m => m.leads);
      const { mean, stdDev } = calcStats(values);
      const latest = values[values.length - 1] ?? 0;
      const z = zScore(latest, mean, stdDev);
      const changeVsMean = mean > 0 ? Math.round(((latest - mean) / mean) * 100) : 0;

      metrics.push({
        label: 'Leads SDR',
        unit: 'number',
        series: series.map(m => ({ monthKey: m.month, label: m.month, value: m.leads })),
        mean: Math.round(mean * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        latest,
        latestLabel: series[series.length - 1].month,
        zScore: Math.round(z * 100) / 100,
        status: anomalyStatus(z),
        direction: latest >= mean ? 'up' : 'down',
        changeVsMean,
      });
    }

    // 4. Investimento Google Ads por Mês
    if (googleAdsData?.months && googleAdsData.months.length >= 3) {
      const series = [...googleAdsData.months].sort((a, b) =>
        `${a.year}-${String(a.month).padStart(2, '0')}`.localeCompare(`${b.year}-${String(b.month).padStart(2, '0')}`),
      );
      const values = series.map(m => m.spend);
      const { mean, stdDev } = calcStats(values);
      const latest = values[values.length - 1] ?? 0;
      const z = zScore(latest, mean, stdDev);
      const changeVsMean = mean > 0 ? Math.round(((latest - mean) / mean) * 100) : 0;

      metrics.push({
        label: 'Investimento Google',
        unit: 'currency',
        series: series.map(m => ({ monthKey: `${m.year}-${m.month}`, label: `${m.month}/${m.year}`, value: m.spend })),
        mean: Math.round(mean),
        stdDev: Math.round(stdDev),
        latest: Math.round(latest),
        latestLabel: `${series[series.length - 1].month}/${series[series.length - 1].year}`,
        zScore: Math.round(z * 100) / 100,
        status: anomalyStatus(z),
        direction: latest >= mean ? 'up' : 'down',
        changeVsMean,
      });
    }

    // Gera alertas a partir das métricas anômalas
    const alerts: IntelligenceData['anomalies']['alerts'] = [];
    for (const m of metrics) {
      if (m.status === 'ok') continue;
      const severity = m.status === 'anomaly' ? 'critical' : 'warning';
      const direcao = m.direction === 'up' ? 'acima' : 'abaixo';
      const abs = Math.abs(m.changeVsMean);
      alerts.push({
        metric: m.label,
        severity,
        message: `${m.label} (${m.latestLabel}) está ${abs}% ${direcao} da média histórica`,
        value: m.latest,
        mean: m.mean,
        zScore: m.zScore,
      });
    }

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      hasData: true,
      cohorts: {
        byMonth,
        byChannel,
        totalMonths: byMonth.length,
        topChannel: topChannel?.canal ?? null,
        topChannelTicket: topChannel?.ticketMedio ?? 0,
      },
      anomalies: {
        metrics,
        alerts,
        totalAlerts: alerts.length,
      },
    } satisfies IntelligenceData);
  } catch (error) {
    console.error('Intelligence error:', error instanceof Error ? error.stack : String(error));
    return NextResponse.json({ error: 'Erro ao processar inteligência' }, { status: 500 });
  }
}
