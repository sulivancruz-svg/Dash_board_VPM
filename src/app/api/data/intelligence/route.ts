import { NextRequest, NextResponse } from 'next/server';
import { getPipedriveData, getSdrData } from '@/lib/data-store';
import { blobGetJson } from '@/lib/storage';
import { attributeChannel } from '@/lib/channel-mapping';
import type { GoogleAdsStoredData } from '@/lib/google-ads-store';
import { getPipedriveMetricsForRange } from '@/lib/pipedrive-metrics';
import type { DateRange } from '@/lib/date-range';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  return { mean, stdDev: Math.sqrt(variance) };
}

function linearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length;
  if (n < 2) return { a: 0, b: 0, r2: 0 };
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { a: sumY / n, b: 0, r2: 0 };
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  const yMean = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - yMean, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (a + b * p.x), 2), 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { a, b, r2: Math.max(0, r2) };
}

const PT_MONTHS: Record<number, string> = {
  1:'jan',2:'fev',3:'mar',4:'abr',5:'mai',6:'jun',
  7:'jul',8:'ago',9:'set',10:'out',11:'nov',12:'dez',
};

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ChannelRanking {
  canal: string;
  attribution: string;
  receita: number;
  deals: number;
  ticketMedio: number;
  pctReceita: number;
}

export interface TemporalCell {
  monthKey: string;       // "2026-03"
  monthLabel: string;     // "mar/2026"
  receita: number;
  deals: number;
  ticketMedio: number;
}

export interface TemporalChannel {
  canal: string;
  attribution: string;
  cells: TemporalCell[];  // um por mês, ordenado ASC
  totalReceita: number;
  totalDeals: number;
}

export interface ProjectionPoint {
  monthKey: string;
  label: string;
  invest: number;
  receita: number;
}

export interface GoogleProjection {
  points: ProjectionPoint[];        // histórico de pares (investimento, receita)
  regression: { a: number; b: number; r2: number };
  roiHistorico: number;             // receita / investimento médio histórico
  forecast: Array<{                 // cenários de simulação
    invest: number;
    receitaEsperada: number;
    roi: number;
  }>;
  hasEnoughData: boolean;
}

export interface EfficiencyScore {
  canal: string;
  tipo: 'google' | 'meta';
  investimento: number;
  receita: number;
  roi: number;             // receita / investimento
  roiLabel: string;        // "3.2x"
  deals: number;
  ticketMedio: number;
  cpa: number;             // investimento / deals
}

export interface AnomalyMetric {
  label: string;
  unit: 'currency' | 'number';
  series: Array<{ monthKey: string; label: string; value: number }>;
  mean: number;
  stdDev: number;
  latest: number;
  latestLabel: string;
  zScore: number;
  status: 'ok' | 'warning' | 'anomaly';
  direction: 'up' | 'down' | 'stable';
  changeVsMean: number;
}

export interface IntelligenceData {
  updatedAt: string;
  hasData: boolean;
  allMonthKeys: string[];           // todos os meses com dados, para alinhar tabela temporal

  // 1. Ranking de canais (ticket + receita)
  channelRanking: ChannelRanking[];

  // 2. Evolução temporal por canal
  temporalByChannel: TemporalChannel[];

  // 3. Projeção Google
  googleProjection: GoogleProjection;

  // 4. Score de eficiência (apenas paid)
  efficiencyScores: EfficiencyScore[];

  // 5. Radar de anomalias (mantido)
  anomalies: {
    metrics: AnomalyMetric[];
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

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // Parâmetros de período
    const sp    = req.nextUrl.searchParams;
    const start = sp.get('start') ?? null;
    const end   = sp.get('end')   ?? null;

    const range: DateRange | undefined =
      start && end ? { start, end } : undefined;

    // Meses dentro do range (para filtrar google months e anomalias)
    const monthInRange = (monthKey: string): boolean => {
      if (!start && !end) return true;
      const startMk = start ? start.substring(0, 7) : null;
      const endMk   = end   ? end.substring(0, 7)   : null;
      if (startMk && monthKey < startMk) return false;
      if (endMk   && monthKey > endMk)   return false;
      return true;
    };

    const [pipedriveData, sdrData, googleAdsData] = await Promise.all([
      getPipedriveData(),
      getSdrData(),
      blobGetJson<GoogleAdsStoredData>('google-ads-data'),
    ]);

    const empty: IntelligenceData = {
      updatedAt: new Date().toISOString(),
      hasData: false,
      allMonthKeys: [],
      channelRanking: [],
      temporalByChannel: [],
      googleProjection: { points: [], regression: { a: 0, b: 0, r2: 0 }, roiHistorico: 0, forecast: [], hasEnoughData: false },
      efficiencyScores: [],
      anomalies: { metrics: [], alerts: [], totalAlerts: 0 },
    };

    if (!pipedriveData) return NextResponse.json(empty);

    // ── Fonte única de verdade: mesma função usada por todas as outras páginas ──
    const metrics = getPipedriveMetricsForRange(pipedriveData, range);
    if (!metrics) return NextResponse.json(empty);

    // Deals com receita real (mondeDeals filtrados pelo período)
    const deals = metrics.mondeDeals;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. RANKING DE CANAIS — usa exatamente os mesmos dados de Canais e Receita
    // ──────────────────────────────────────────────────────────────────────────
    const grandTotal = metrics.channels.reduce((s, c) => s + c.receita, 0);

    const channelRanking: ChannelRanking[] = metrics.channels
      .map(ch => ({
        canal: ch.canal,
        attribution: attributeChannel(ch.canal),
        receita: Math.round(ch.receita),
        deals: ch.vendas,
        ticketMedio: ch.ticket ?? (ch.vendas > 0 ? Math.round(ch.receita / ch.vendas) : 0),
        pctReceita: grandTotal > 0 ? Math.round((ch.receita / grandTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.ticketMedio - a.ticketMedio);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. EVOLUÇÃO TEMPORAL POR CANAL (mês × canal)
    //    Usa mondeDeals filtrados pelo período (mesma fonte de receita)
    // ──────────────────────────────────────────────────────────────────────────
    const temporal = new Map<string, Map<string, { receita: number; deals: number }>>();
    const allMonthSet = new Set<string>();

    if (deals.length > 0) {
      for (const d of deals) {
        if (!d.createdDate) continue;
        const monthKey = d.createdDate.substring(0, 7);
        const canal    = d.canal || 'Não informado';
        allMonthSet.add(monthKey);

        if (!temporal.has(canal)) temporal.set(canal, new Map());
        const mMap = temporal.get(canal)!;
        const cur  = mMap.get(monthKey) ?? { receita: 0, deals: 0 };
        cur.receita += d.receita;
        cur.deals   += 1;
        mMap.set(monthKey, cur);
      }
    } else {
      // Fallback: usa monthly já calculado pelo metrics (mesma lógica)
      for (const m of metrics.monthly) {
        allMonthSet.add(m.monthKey);
      }
    }

    const allMonthKeys = Array.from(allMonthSet).sort();

    // Pega top 6 canais por receita total para não poluir a tabela
    const topCanais = Array.from(temporal.entries())
      .map(([canal, mMap]) => ({
        canal,
        total: Array.from(mMap.values()).reduce((s, c) => s + c.receita, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map(c => c.canal);

    const temporalByChannel: TemporalChannel[] = topCanais.map(canal => {
      const mMap = temporal.get(canal)!;
      const cells: TemporalCell[] = allMonthKeys.map(mk => {
        const [y, m] = mk.split('-').map(Number);
        const data   = mMap.get(mk) ?? { receita: 0, deals: 0 };
        return {
          monthKey:   mk,
          monthLabel: `${PT_MONTHS[m]}/${y}`,
          receita:    Math.round(data.receita),
          deals:      data.deals,
          ticketMedio: data.deals > 0 ? Math.round(data.receita / data.deals) : 0,
        };
      });
      const totalReceita = cells.reduce((s, c) => s + c.receita, 0);
      const totalDeals   = cells.reduce((s, c) => s + c.deals, 0);
      return {
        canal,
        attribution: attributeChannel(canal),
        cells,
        totalReceita,
        totalDeals,
      };
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. PROJEÇÃO GOOGLE
    //    Cruza investimento Google (por mês) × receita de oportunidades criadas
    //    no mesmo mês. Regressão linear → forecast.
    // ──────────────────────────────────────────────────────────────────────────
    const googleMonths = googleAdsData?.months ?? [];

    // Receita por mês — usa metrics.monthly (mesma fonte de verdade)
    // Para regressão usamos histórico completo (sem filtro de período),
    // pois precisamos de mais pontos para a correlação ser confiável.
    const metricsAll = getPipedriveMetricsForRange(pipedriveData, undefined);
    const pipeMonthMap = new Map<string, number>();
    for (const m of (metricsAll?.monthly ?? metrics.monthly)) {
      pipeMonthMap.set(m.monthKey, m.receita);
    }

    const projPoints: ProjectionPoint[] = [];
    for (const gm of googleMonths) {
      const [y, m] = [gm.year, gm.month as unknown as number];
      const monthNum = typeof gm.month === 'number'
        ? gm.month
        : Object.entries(PT_MONTHS).find(([, v]) => v === gm.month)?.[0];
      const mk = `${y}-${String(monthNum || m).padStart(2, '0')}`;
      const receita = pipeMonthMap.get(mk) ?? 0;
      const monthNumInt = typeof monthNum === 'string' ? parseInt(monthNum) : (monthNum as number | undefined) ?? 0;
      if (gm.spend > 0) {
        projPoints.push({
          monthKey: mk,
          label: `${PT_MONTHS[monthNumInt] ?? gm.month}/${y}`,
          invest:  Math.round(gm.spend),
          receita: Math.round(receita),
        });
      }
    }
    projPoints.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const regression = linearRegression(projPoints.map(p => ({ x: p.invest, y: p.receita })));
    const totalGoogleInvest  = projPoints.reduce((s, p) => s + p.invest, 0);
    const totalGoogleReceita = projPoints.reduce((s, p) => s + p.receita, 0);
    const roiHistorico       = totalGoogleInvest > 0
      ? Math.round((totalGoogleReceita / totalGoogleInvest) * 100) / 100
      : 0;

    // Cenários de simulação baseados no investimento médio histórico
    const avgInvest = projPoints.length > 0 ? totalGoogleInvest / projPoints.length : 5000;
    const scenarios = [0.5, 1, 1.5, 2, 3].map(mult => {
      const invest = Math.round(avgInvest * mult);
      const receitaEsperada = Math.max(0, Math.round(regression.a + regression.b * invest));
      return {
        invest,
        receitaEsperada,
        roi: invest > 0 ? Math.round((receitaEsperada / invest) * 100) / 100 : 0,
      };
    });

    const googleProjection: GoogleProjection = {
      points: projPoints,
      regression: {
        a:  Math.round(regression.a),
        b:  Math.round(regression.b * 100) / 100,
        r2: Math.round(regression.r2 * 100) / 100,
      },
      roiHistorico,
      forecast: scenarios,
      hasEnoughData: projPoints.length >= 3,
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 4. SCORE DE EFICIÊNCIA — apenas canais pagos
    //    Cruza receita atribuída ao canal × investimento real
    // ──────────────────────────────────────────────────────────────────────────
    // Usa metrics.channels — mesma fonte que as outras páginas
    const paidChannels = metrics.channels.filter(
      ch => attributeChannel(ch.canal) === 'PAID_MEDIA',
    );

    // Receita Google: soma dos canais classificados como PAID_MEDIA que contenham "Google"
    const receitaGoogle = paidChannels
      .filter(ch => /google/i.test(ch.canal))
      .reduce((s, ch) => s + ch.receita, 0);

    // Receita Meta: soma dos canais classificados como PAID_MEDIA que sejam redes sociais
    const receitaMeta = paidChannels
      .filter(ch => /meta|instagram|facebook|redes?\s*social/i.test(ch.canal))
      .reduce((s, ch) => s + ch.receita, 0);

    // Receita "Site" e outros paid sem canal específico — agrupa em "outros pagos"
    const receitaOutrosPaid = paidChannels
      .filter(ch => !/google|meta|instagram|facebook|redes?\s*social/i.test(ch.canal))
      .reduce((s, ch) => s + ch.receita, 0);

    const investGoogle = googleAdsData?.totalSpend ?? 0;
    // Meta: usa dado da store se disponível (não temos no momento → deixa 0 se ausente)
    // Para não bloquear, mantemos como 0 até ter o token Meta ativo
    const investMeta   = 0;   // será preenchido quando Meta API estiver conectada

    const efficiencyScores: EfficiencyScore[] = [];

    if (investGoogle > 0 || receitaGoogle > 0) {
      const roi = investGoogle > 0 ? receitaGoogle / investGoogle : 0;
      const dealsGoogle = paidChannels.filter(ch => /google/i.test(ch.canal)).reduce((s, ch) => s + ch.vendas, 0);
      efficiencyScores.push({
        canal: 'Google Ads',
        tipo: 'google',
        investimento: Math.round(investGoogle),
        receita: Math.round(receitaGoogle),
        roi: Math.round(roi * 100) / 100,
        roiLabel: `${Math.round(roi * 10) / 10}x`,
        deals: dealsGoogle,
        ticketMedio: dealsGoogle > 0 ? Math.round(receitaGoogle / dealsGoogle) : 0,
        cpa: dealsGoogle > 0 && investGoogle > 0 ? Math.round(investGoogle / dealsGoogle) : 0,
      });
    }

    if (receitaMeta > 0 || investMeta > 0) {
      const roi = investMeta > 0 ? receitaMeta / investMeta : 0;
      const dealsMeta = paidChannels.filter(ch => /meta|instagram|facebook|redes?\s*social/i.test(ch.canal)).reduce((s, ch) => s + ch.vendas, 0);
      efficiencyScores.push({
        canal: 'Meta Ads',
        tipo: 'meta',
        investimento: Math.round(investMeta),
        receita: Math.round(receitaMeta),
        roi: Math.round(roi * 100) / 100,
        roiLabel: investMeta > 0 ? `${Math.round(roi * 10) / 10}x` : 'N/D',
        deals: dealsMeta,
        ticketMedio: dealsMeta > 0 ? Math.round(receitaMeta / dealsMeta) : 0,
        cpa: dealsMeta > 0 && investMeta > 0 ? Math.round(investMeta / dealsMeta) : 0,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. RADAR DE ANOMALIAS
    // ──────────────────────────────────────────────────────────────────────────
    const anomalyMetrics: AnomalyMetric[] = [];

    const addMetric = (
      label: string,
      unit: 'currency' | 'number',
      series: Array<{ monthKey: string; label: string; value: number }>,
    ) => {
      if (series.length < 3) return;
      const values  = series.map(s => s.value);
      const { mean, stdDev } = calcStats(values);
      const latest  = values[values.length - 1] ?? 0;
      const z       = stdDev > 0 ? (latest - mean) / stdDev : 0;
      const absZ    = Math.abs(z);
      const status: AnomalyMetric['status'] = absZ > 2 ? 'anomaly' : absZ > 1.2 ? 'warning' : 'ok';
      const changeVsMean = mean > 0 ? Math.round(((latest - mean) / mean) * 100) : 0;
      anomalyMetrics.push({
        label, unit, series,
        mean: Math.round(mean),
        stdDev: Math.round(stdDev),
        latest: Math.round(latest),
        latestLabel: series[series.length - 1].label,
        zScore: Math.round(z * 100) / 100,
        status,
        direction: latest > mean ? 'up' : latest < mean ? 'down' : 'stable',
        changeVsMean,
      });
    };

    // Para anomalias usa histórico completo (sem filtro de período) para ter
    // mais pontos e detectar desvios com maior precisão estatística
    const allMonthly = (metricsAll?.monthly ?? metrics.monthly)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    if (allMonthly.length) {
      addMetric('Faturamento Mensal', 'currency',
        allMonthly.map(m => ({ monthKey: m.monthKey, label: `${m.month}/${m.year}`, value: m.receita })));
      addMetric('Deals Fechados', 'number',
        allMonthly.map(m => ({ monthKey: m.monthKey, label: `${m.month}/${m.year}`, value: m.deals })));
    }
    // Leads SDR
    if (sdrData?.months?.length) {
      addMetric('Leads SDR', 'number',
        sdrData.months.map(m => ({ monthKey: m.month, label: m.month, value: m.leads })));
    }

    const anomalyAlerts = anomalyMetrics
      .filter(m => m.status !== 'ok')
      .map(m => ({
        metric: m.label,
        severity: m.status === 'anomaly' ? 'critical' as const : 'warning' as const,
        message: `${m.label} (${m.latestLabel}) está ${Math.abs(m.changeVsMean)}% ${m.direction === 'up' ? 'acima' : 'abaixo'} da média histórica`,
        value: m.latest,
        mean: m.mean,
        zScore: m.zScore,
      }));

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      hasData: true,
      allMonthKeys,
      channelRanking,
      temporalByChannel,
      googleProjection,
      efficiencyScores,
      anomalies: { metrics: anomalyMetrics, alerts: anomalyAlerts, totalAlerts: anomalyAlerts.length },
    } satisfies IntelligenceData);

  } catch (error) {
    console.error('Intelligence error:', error instanceof Error ? error.stack : String(error));
    return NextResponse.json({ error: 'Erro ao processar inteligência' }, { status: 500 });
  }
}
