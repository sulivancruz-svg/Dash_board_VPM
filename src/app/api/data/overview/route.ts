import { NextRequest, NextResponse } from 'next/server';
import { getMetaToken } from '@/lib/meta-token-store';
import { getSdrData, getPipedriveData } from '@/lib/data-store';
import { getSourceControls } from '@/lib/source-controls';
import { attributeChannel, ChannelAttribution, ATTRIBUTION_LABELS } from '@/lib/channel-mapping';
import { getGoogleAdsDataForDateRange, getGoogleAdsDataForPeriod } from '@/lib/google-ads-store';
import { buildPtBrDateLabel, resolveDateRange, parseIsoDate, formatIsoDate } from '@/lib/date-range';
import { getPipedriveMetricsForRange } from '@/lib/pipedrive-metrics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDatePreset(days: string): string {
  const d = parseInt(days);
  if (d <= 7) return 'last_7d';
  if (d <= 14) return 'last_14d';
  return 'last_30d';
}

function buildPeriodLabel(days: number): string {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(start)} – ${fmt(now)}`;
}

export async function GET(req: NextRequest) {
  try {
    const range = resolveDateRange(
      req.nextUrl.searchParams.get('start'),
      req.nextUrl.searchParams.get('end'),
      Number.parseInt(req.nextUrl.searchParams.get('period') || '30', 10),
    );
    const periodDays = range.periodDays;
    const sourceControls = await getSourceControls();
    const metaToken = await getMetaToken();

    // Carrega fontes conforme controles ativos
    const sdrData = sourceControls.sdrEnabled ? await getSdrData() : null;
    const pipedriveData = sourceControls.pipedriveEnabled ? await getPipedriveData() : null;
    const pipedriveMetrics = getPipedriveMetricsForRange(pipedriveData, range);
    const googleAdsData = sourceControls.googleAdsEnabled
      ? await getGoogleAdsDataForDateRange(range.start, range.end) || await getGoogleAdsDataForPeriod(periodDays)
      : null;

    // ────────────────────────────────────────────────
    // ROAS COM LAG DE 14 DIAS
    // Para cálculo correto, usa investimento do período anterior
    // (cliques em período anterior → conversões em período atual)
    // ────────────────────────────────────────────────
    const LAG_DAYS = 14;
    const startDate = parseIsoDate(range.start)!;
    const endDate = parseIsoDate(range.end)!;
    const previousRange = {
      start: formatIsoDate(new Date(startDate.getTime() - LAG_DAYS * 24 * 60 * 60 * 1000)),
      end: formatIsoDate(new Date(endDate.getTime() - LAG_DAYS * 24 * 60 * 60 * 1000)),
      periodDays: range.periodDays,
    };
    const googleAdsPrevious = sourceControls.googleAdsEnabled
      ? await getGoogleAdsDataForDateRange(previousRange.start, previousRange.end) || await getGoogleAdsDataForPeriod(periodDays)
      : null;

    // ────────────────────────────────────────────────
    // META ADS — investimento (tráfego pago)
    // ────────────────────────────────────────────────
    let metaInvestimento = 0;
    let metaImpressions = 0;
    let metaClicks = 0;
    let metaResults = 0;
    let metaConnected = false;

    // Meta investimento do período ATUAL (para exibição)
    if (metaToken?.token) {
      try {
        const accountId = metaToken.accountId;
        const url = new URL(`https://graph.facebook.com/v20.0/${accountId}/insights`);
        url.searchParams.append('access_token', metaToken.token);
        url.searchParams.append('fields', 'spend,impressions,clicks,actions');
        url.searchParams.append('time_range', JSON.stringify({ since: range.start, until: range.end }));

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          const row = data.data?.[0] || {};
          metaInvestimento = parseFloat(row.spend || '0');
          metaImpressions = parseInt(row.impressions || '0');
          metaClicks = parseInt(row.clicks || '0');
          if (row.actions && Array.isArray(row.actions)) {
            metaResults = row.actions.reduce((s: number, a: any) => s + parseInt(a.value || '0'), 0);
          }
          metaConnected = true;
        }
      } catch (e) {
        console.error('Error fetching meta data for overview:', e);
      }
    }

    // Meta investimento do período ANTERIOR (para ROAS com lag)
    let metaInvestimentoPrevious = 0;
    if (metaToken?.token) {
      try {
        const accountId = metaToken.accountId;
        const url = new URL(`https://graph.facebook.com/v20.0/${accountId}/insights`);
        url.searchParams.append('access_token', metaToken.token);
        url.searchParams.append('fields', 'spend');
        url.searchParams.append('time_range', JSON.stringify({ since: previousRange.start, until: previousRange.end }));

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          const row = data.data?.[0] || {};
          metaInvestimentoPrevious = parseFloat(row.spend || '0');
        }
      } catch (e) {
        console.error('Error fetching meta data previous period for ROAS:', e);
      }
    }

    // ────────────────────────────────────────────────
    // GOOGLE ADS — investimento (tráfego pago)
    // ────────────────────────────────────────────────
    const googleSpend = googleAdsData?.totalSpend || 0;
    const googleClicks = googleAdsData?.totalClicks || 0;
    const googleImpressions = googleAdsData?.totalImpressions || 0;
    const hasGoogleData = !!googleAdsData;

    // Período de referência dos dados importados (Google Ads months)
    const googleMonths: Array<{ month: string; year: number; spend: number; clicks: number; impressions: number }> =
      googleAdsData?.months || [];
    const referencePeriod =
      googleMonths.length > 0
        ? googleMonths.map((m) => `${m.month}/${m.year}`).join(', ')
        : null;

    // ────────────────────────────────────────────────
    // INVESTIMENTO TOTAL = Meta + Google
    // ────────────────────────────────────────────────
    const totalInvestimento = metaInvestimento + googleSpend;

    // ────────────────────────────────────────────────
    // RECEITA — ÚNICA FONTE: Pipe Monde
    // SDR NÃO entra como receita. Apenas leads/qualificados/vendas.
    // ────────────────────────────────────────────────
    const mondeRevenue = pipedriveMetrics?.totalRevenue || 0; // faturamento confirmado no Monde
    const totalVendas = pipedriveMetrics?.totalDeals || 0;    // deals com faturamento Monde

    // ── Agrupa receita por categoria de atribuição ──────────────────────────
    // PAID_MEDIA        → ROI/CAC (Google + Redes Sociais)
    // ORGANIC_COMMERCIAL → excluído do ROI (Indicação, Networking, Prospecção)
    // BRAND_BASE         → ambíguo (Espontaneamente, Site, E-mail, Pós-Viagem)
    // UNKNOWN            → não informado
    type AttrGroup = { receita: number; vendas: number };
    const attrAccum: Record<ChannelAttribution, AttrGroup> = {
      PAID_MEDIA:         { receita: 0, vendas: 0 },
      ORGANIC_COMMERCIAL: { receita: 0, vendas: 0 },
      BRAND_BASE:         { receita: 0, vendas: 0 },
      UNKNOWN:            { receita: 0, vendas: 0 },
    };

    for (const c of (pipedriveMetrics?.channels || [])) {
      const attr = attributeChannel(c.canal);
      attrAccum[attr].receita += c.receita || 0;
      attrAccum[attr].vendas  += c.vendas || 0;
    }

    const receitaMidiaPaga   = Math.round(attrAccum.PAID_MEDIA.receita * 100) / 100;
    const vendasMidiaPaga    = attrAccum.PAID_MEDIA.vendas;
    const receitaOrganica    = Math.round(attrAccum.ORGANIC_COMMERCIAL.receita * 100) / 100;
    const receitaBranding    = Math.round(attrAccum.BRAND_BASE.receita * 100) / 100;
    const receitaDesconhecida = Math.round(attrAccum.UNKNOWN.receita * 100) / 100;

    const byAttribution = (['PAID_MEDIA', 'ORGANIC_COMMERCIAL', 'BRAND_BASE', 'UNKNOWN'] as ChannelAttribution[]).map(attr => ({
      attribution: attr,
      label: ATTRIBUTION_LABELS[attr],
      receita: Math.round(attrAccum[attr].receita * 100) / 100,
      vendas: attrAccum[attr].vendas,
      receitaPct: mondeRevenue > 0 ? Math.round((attrAccum[attr].receita / mondeRevenue) * 1000) / 10 : 0,
    }));

    // Top canais por receita (Pipedrive/Monde)
    const pipedriveChannels = (pipedriveMetrics?.channels || [])
      .slice(0, 8)
      .map((c) => ({
        canal: c.canal,
        attribution: attributeChannel(c.canal),
        vendas: c.vendas,
        receita: c.receita,
        ticket: c.ticket,
      }));

    // ────────────────────────────────────────────────
    // SDR — atendimento, canal de origem e conversão
    // NÃO usar para receita financeira
    // ────────────────────────────────────────────────
    const sdrSection = {
      enabled: sourceControls.sdrEnabled,
      hasData: !!sdrData,
      updatedAt: sdrData?.updatedAt || null,
      totalLeads: sdrData?.totalLeads || 0,
      totalQualified: sdrData?.totalQualified || 0,
      totalSales: sdrData?.totalSales || 0, // quantidade de fechamentos via SDR
      channels: (sdrData?.channels || []).map((c) => ({
        canal: c.canal,
        vendas: c.vendas, // conversões por canal (sem valor financeiro)
      })),
      months: sdrData?.months || [],
    };


    // ────────────────────────────────────────────────
    // KPIs calculados
    // ────────────────────────────────────────────────
    // ROI (ROAS): receita APENAS de canais de mídia paga / investimento do período anterior (com lag de 14 dias)
    // Lógica: cliques em período anterior → conversões em período atual
    // Lógica BI: incluir receita de Indicação/Networking inflacionaria artificialmente o ROAS
    const googleSpendPrevious = googleAdsPrevious?.totalSpend || 0;
    const totalInvestimentoPrevious = metaInvestimentoPrevious + googleSpendPrevious;
    const roi =
      totalInvestimentoPrevious > 0 && receitaMidiaPaga > 0
        ? Math.round((receitaMidiaPaga / totalInvestimentoPrevious) * 100) / 100
        : null;

    // Custo por Oportunidade (CPL) = investimento / todas as oportunidades (leads) do Pipedrive
    const totalLeadsForCpl = pipedriveMetrics?.totalLeads || sdrData?.totalLeads || 0;
    const cpl = totalLeadsForCpl > 0 && totalInvestimento > 0
      ? Math.round(totalInvestimento / totalLeadsForCpl)
      : null;

    // Taxa de conversão: leads → vendas (Pipedrive: totalDeals/totalLeads)
    const conversionRate = totalLeadsForCpl > 0 && totalVendas > 0
      ? Math.round((totalVendas / totalLeadsForCpl) * 1000) / 10
      : null;

    return NextResponse.json({
      period: `${periodDays} dias`,
      periodLabel: buildPtBrDateLabel(range),
      referencePeriod, // ex: "fevereiro/2026"

      // ── Mídia Paga ──
      meta: {
        connected: metaConnected,
        accountName: metaToken?.accountName || null,
        investimento: Math.round(metaInvestimento * 100) / 100,
        impressions: metaImpressions,
        clicks: metaClicks,
        results: metaResults,
      },
      googleAds: {
        connected: hasGoogleData,
        accountName: googleAdsData?.accountName || null,
        investimento: Math.round(googleSpend * 100) / 100,
        impressions: googleImpressions,
        clicks: googleClicks,
        months: googleMonths,
        channelBreakdown: googleAdsData?.channelBreakdown || [],
      },

      // ── Receita real (somente Monde via Pipedrive) ──
      pipedrive: {
        connected: !!pipedriveData,
        updatedAt: pipedriveData?.updatedAt || null,
        totalDeals: pipedriveMetrics?.totalDeals || 0,
        totalLeads: pipedriveMetrics?.totalLeads || 0,
        totalLost: pipedriveMetrics?.totalLost || 0,
        withMondeBilling: pipedriveMetrics?.withMondeBilling || 0,
        mondeRevenue,                // receita TOTAL confirmada no Monde
        totalRevenue: mondeRevenue,  // alias
        channels: pipedriveChannels,
        // ── Breakdown por atribuição de canal ──────────
        // Receita dividida por origem: Mídia Paga, Orgânico, Branding, Desconhecido
        byAttribution,
        receitaMidiaPaga,    // base do ROI/CAC (Google + Redes Sociais)
        receitaOrganica,     // Indicação + Networking + Prospecção (sem custo de mídia)
        receitaBranding,     // Espontaneamente + Site + Email + Pós-viagem (ambíguo)
        receitaDesconhecida, // canal não informado
        vendasMidiaPaga,     // deals atribuídos à mídia paga
      },

      // ── SDR — camada de atendimento e conversão (sem receita) ──
      sdr: sdrSection,

      // ── KPIs executivos ──
      kpis: {
        investimento: Math.round(totalInvestimento * 100) / 100,
        investimentoMeta: Math.round(metaInvestimento * 100) / 100,
        investimentoGoogle: Math.round(googleSpend * 100) / 100,
        receita: mondeRevenue,      // receita TOTAL (referência)
        receitaMidiaPaga,           // receita somente mídia paga — base do ROI
        vendas: totalVendas,        // deals TOTAL Pipedrive
        vendasMidiaPaga,            // deals atribuídos à mídia paga
        roi,  // ROAS: receitaMidiaPaga / totalInvestimento
        cpl,  // Custo por Oportunidade: investimento total / oportunidades do Pipedrive
        conversionRate, // % de leads que viraram venda
        avgDaysToWin: pipedriveMetrics?.avgDaysToWin ?? null, // tempo médio entre entrada e venda (Monde)
      },
    });
  } catch (error) {
    console.error('Overview error:', error instanceof Error ? error.stack || error.message : String(error));
    return NextResponse.json({ error: 'Erro ao buscar visão geral' }, { status: 500 });
  }
}
