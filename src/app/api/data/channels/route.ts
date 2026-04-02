import { NextRequest, NextResponse } from 'next/server';
import { getSdrData, getPipedriveData } from '@/lib/data-store';
import { getSourceControls } from '@/lib/source-controls';
import {
  attributeChannel,
  ChannelAttribution,
  ATTRIBUTION_LABELS,
  ATTRIBUTION_DESCRIPTIONS,
} from '@/lib/channel-mapping';
import { buildPtBrDateLabel, resolveDateRange } from '@/lib/date-range';
import { getPipedriveMetricsForRange } from '@/lib/pipedrive-metrics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTH_ORDER: Record<string, number> = {
  janeiro: 1, fevereiro: 2, 'mar\u00e7o': 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

export async function GET(req: NextRequest) {
  try {
    const hasExplicitRange = (
      req.nextUrl.searchParams.has('start')
      || req.nextUrl.searchParams.has('end')
      || req.nextUrl.searchParams.has('period')
    );
    const range = hasExplicitRange
      ? resolveDateRange(
        req.nextUrl.searchParams.get('start'),
        req.nextUrl.searchParams.get('end'),
        Number.parseInt(req.nextUrl.searchParams.get('period') || '30', 10),
      )
      : null;

    const sourceControls = getSourceControls();
    const sdrData = sourceControls.sdrEnabled ? getSdrData() : null;
    const pipedriveData = sourceControls.pipedriveEnabled ? getPipedriveData() : null;
    const pipedriveMetrics = getPipedriveMetricsForRange(pipedriveData, range || undefined);

    if (!sdrData && !pipedriveData) {
      return NextResponse.json({ hasData: false, channels: [], byAttribution: [] });
    }

    const channelMap = new Map<string, {
      canal: string;
      attribution: ChannelAttribution;
      leads: number;
      qualificados: number;
      vendas: number;
      receita: number;
      ticket: number;
    }>();

    for (const channel of (pipedriveMetrics?.channels || [])) {
      channelMap.set(channel.canal, {
        canal: channel.canal,
        attribution: attributeChannel(channel.canal),
        leads: channel.leads || 0,
        qualificados: 0,
        vendas: channel.vendas || 0,
        receita: channel.receita || 0,
        ticket: channel.ticket || 0,
      });
    }

    for (const channel of (sdrData?.channels || [])) {
      const existing = channelMap.get(channel.canal);
      if (existing) {
        channelMap.set(channel.canal, {
          ...existing,
          leads: existing.leads > 0 ? existing.leads : (channel.leads || 0),
          qualificados: channel.qualificados || 0,
          vendas: Math.max(existing.vendas, channel.vendas || 0),
        });
      } else {
        channelMap.set(channel.canal, {
          canal: channel.canal,
          attribution: attributeChannel(channel.canal),
          leads: channel.leads || 0,
          qualificados: channel.qualificados || 0,
          vendas: channel.vendas || 0,
          receita: channel.receita || 0,
          ticket: channel.ticket || 0,
        });
      }
    }

    const channels = Array.from(channelMap.values()).sort((a, b) => b.receita - a.receita);
    const totalReceita = Math.round(channels.reduce((sum, channel) => sum + channel.receita, 0) * 100) / 100;
    const totalVendas = channels.reduce((sum, channel) => sum + channel.vendas, 0);
    const totalLeads = channels.reduce((sum, channel) => sum + channel.leads, 0);

    const channelsWithPct = channels.map((channel) => ({
      ...channel,
      receitaPct: totalReceita > 0 ? Math.round((channel.receita / totalReceita) * 1000) / 10 : 0,
      vendasPct: totalVendas > 0 ? Math.round((channel.vendas / totalVendas) * 1000) / 10 : 0,
    }));

    const attrAccum: Record<ChannelAttribution, { receita: number; vendas: number; leads: number; canais: string[] }> = {
      PAID_MEDIA: { receita: 0, vendas: 0, leads: 0, canais: [] },
      ORGANIC_COMMERCIAL: { receita: 0, vendas: 0, leads: 0, canais: [] },
      BRAND_BASE: { receita: 0, vendas: 0, leads: 0, canais: [] },
      UNKNOWN: { receita: 0, vendas: 0, leads: 0, canais: [] },
    };

    for (const channel of channelsWithPct) {
      const attr = channel.attribution;
      attrAccum[attr].receita += channel.receita;
      attrAccum[attr].vendas += channel.vendas;
      attrAccum[attr].leads += channel.leads;
      attrAccum[attr].canais.push(channel.canal);
    }

    const byAttribution = (['PAID_MEDIA', 'ORGANIC_COMMERCIAL', 'BRAND_BASE', 'UNKNOWN'] as ChannelAttribution[]).map((attr) => ({
      attribution: attr,
      label: ATTRIBUTION_LABELS[attr],
      description: ATTRIBUTION_DESCRIPTIONS[attr],
      receita: Math.round(attrAccum[attr].receita * 100) / 100,
      vendas: attrAccum[attr].vendas,
      leads: attrAccum[attr].leads,
      totalCanais: attrAccum[attr].canais.length,
      canais: attrAccum[attr].canais,
      receitaPct: totalReceita > 0 ? Math.round((attrAccum[attr].receita / totalReceita) * 1000) / 10 : 0,
      vendasPct: totalVendas > 0 ? Math.round((attrAccum[attr].vendas / totalVendas) * 1000) / 10 : 0,
      usedForRoi: attr === 'PAID_MEDIA',
    }));

    const months = (sdrData?.months || []).slice().sort((a, b) => {
      const yearDiff = (a.year ?? 0) - (b.year ?? 0);
      if (yearDiff !== 0) return yearDiff;
      return (MONTH_ORDER[a.month?.toLowerCase()] ?? 99) - (MONTH_ORDER[b.month?.toLowerCase()] ?? 99);
    });

    return NextResponse.json({
      hasData: true,
      updatedAt: pipedriveData?.updatedAt || sdrData?.updatedAt || null,
      periodoMonde: range ? buildPtBrDateLabel(range) : (pipedriveMetrics?.period || pipedriveData?.period || null),
      sources: {
        sdrEnabled: sourceControls.sdrEnabled,
        pipedriveEnabled: sourceControls.pipedriveEnabled,
        sdrHasData: !!sdrData,
        pipedriveHasData: !!pipedriveData,
      },
      summary: {
        totalReceita,
        totalVendas,
        totalLeads: pipedriveMetrics?.totalLeads || sdrData?.totalLeads || totalLeads,
        totalLost: pipedriveMetrics?.totalLost || 0,
        totalQualified: sdrData?.totalQualified || 0,
        ticketMedio: totalVendas > 0 ? Math.round(totalReceita / totalVendas) : 0,
        totalCanais: channels.length,
        receitaMidiaPaga: Math.round(attrAccum.PAID_MEDIA.receita * 100) / 100,
        vendasMidiaPaga: attrAccum.PAID_MEDIA.vendas,
      },
      channels: channelsWithPct,
      byAttribution,
      months,
    });
  } catch (error) {
    console.error('Channels error:', error);
    return NextResponse.json({ error: 'Erro ao buscar canais' }, { status: 500 });
  }
}
