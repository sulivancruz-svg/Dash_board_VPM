import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getPipedriveData } from '@/lib/data-store';
import { blobGetJson } from '@/lib/storage';
import { getMetaToken } from '@/lib/meta-token-store';
import { getPipedriveMetricsForRange } from '@/lib/pipedrive-metrics';
import { attributeChannel } from '@/lib/channel-mapping';
import { buildIntelligencePrompt, type IntelligenceContextData } from '@/lib/ai/intelligence-context';
import type { GoogleAdsStoredData } from '@/lib/google-ads-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = body?.question ?? '';
    const dateRange = body?.dateRange ?? {};
    const startDate = dateRange.start ? new Date(dateRange.start) : undefined;
    const endDate = dateRange.end ? new Date(dateRange.end) : undefined;

    if (!question.trim()) {
      return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Busca dados com filtro de período selecionado na página
    const [pipedriveData, googleAdsData, metaToken] = await Promise.all([
      getPipedriveData(),
      blobGetJson<GoogleAdsStoredData>('google-ads-data'),
      getMetaToken(),
    ]);

    if (!pipedriveData) {
      return NextResponse.json({ error: 'Nenhum dado importado ainda' }, { status: 400 });
    }

    // Usa o período selecionado na página, ou histórico completo se não especificado
    const metrics = getPipedriveMetricsForRange(pipedriveData, startDate && endDate ? { start: startDate, end: endDate } : undefined);
    if (!metrics) {
      return NextResponse.json({ error: 'Sem métricas disponíveis' }, { status: 400 });
    }

    // Monta KPIs
    const totalReceita = metrics.totalRevenue ?? 0;
    const totalDeals = metrics.totalDeals ?? 0;
    const ticketMedio = totalDeals > 0 ? Math.round(totalReceita / totalDeals) : 0;

    // ROAS: receita de mídia paga / investimento total
    const receitaMidiaPaga = metrics.channels
      .filter(ch => attributeChannel(ch.canal) === 'PAID_MEDIA')
      .reduce((s, ch) => s + ch.receita, 0);
    // Google: totalSpend é o histórico completo salvo no sync — coerente com histórico completo do Pipedrive
    const investGoogle = googleAdsData?.totalSpend ?? 0;

    // Meta: busca período selecionado ou histórico completo
    let investMeta = 0;
    if (metaToken?.token && metaToken?.accountId) {
      try {
        const url = new URL(`https://graph.facebook.com/v20.0/${metaToken.accountId}/insights`);
        url.searchParams.append('access_token', metaToken.token);
        url.searchParams.append('fields', 'spend');

        // Se período foi selecionado, usa esse período
        if (startDate && endDate) {
          const since = startDate.toISOString().substring(0, 10);
          const until = endDate.toISOString().substring(0, 10);
          url.searchParams.append('time_range', JSON.stringify({ since, until }));
        } else if (googleAdsData?.months?.length) {
          // Caso contrário, usa o horizonte do Google Ads salvo
          const sorted = [...googleAdsData.months].sort((a, b) =>
            `${a.year}-${String(typeof a.month === 'number' ? a.month : 1).padStart(2,'0')}`.localeCompare(
              `${b.year}-${String(typeof b.month === 'number' ? b.month : 1).padStart(2,'0')}`)
          );
          const first = sorted[0];
          const since = `${first.year}-01-01`;
          const until = new Date().toISOString().substring(0, 10);
          url.searchParams.append('time_range', JSON.stringify({ since, until }));
        } else {
          url.searchParams.append('date_preset', 'last_year');
        }
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          investMeta = parseFloat(data.data?.[0]?.spend ?? '0');
        }
      } catch {
        // ignora falha do Meta
      }
    }

    const totalInvest = investGoogle + investMeta;
    const roas = totalInvest > 0 && receitaMidiaPaga > 0
      ? Math.round((receitaMidiaPaga / totalInvest) * 100) / 100
      : null;

    // CPL
    const totalLeads = metrics.totalLeads ?? 0;
    const cpl = totalLeads > 0 && totalInvest > 0
      ? Math.round(totalInvest / totalLeads)
      : null;

    // Histórico mensal
    const monthly = (metrics.monthly ?? [])
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(m => ({
        monthKey: m.monthKey,
        month: m.month,
        year: m.year,
        receita: Math.round(m.receita),
        deals: m.deals,
      }));

    // Ranking de canais
    const channelRanking = metrics.channels
      .map(ch => ({
        canal: ch.canal,
        attribution: attributeChannel(ch.canal),
        receita: Math.round(ch.receita),
        deals: ch.vendas,
        ticketMedio: ch.ticket ?? (ch.vendas > 0 ? Math.round(ch.receita / ch.vendas) : 0),
        pctReceita: totalReceita > 0 ? Math.round((ch.receita / totalReceita) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.ticketMedio - a.ticketMedio);

    // Projeção Google
    const googleProjection: IntelligenceContextData['googleProjection'] = {
      hasEnoughData: (googleAdsData?.months?.length ?? 0) >= 3,
      roasHistorico: investGoogle > 0 ? Math.round((receitaMidiaPaga / investGoogle) * 100) / 100 : 0,
      r2: 0,
    };

    // Anomalias simples — detecta queda abrupta no último mês vs média
    const anomalyAlerts: IntelligenceContextData['anomalies']['alerts'] = [];
    if (monthly.length >= 3) {
      const receitas = monthly.map(m => m.receita);
      const historyReceitas = receitas.slice(0, -1); // exclui o último mês do cálculo da média
      const mean = historyReceitas.reduce((a, b) => a + b, 0) / historyReceitas.length;
      const last = receitas[receitas.length - 1];
      const changePct = mean > 0 ? Math.round(((last - mean) / mean) * 100) : 0;
      if (Math.abs(changePct) > 20) {
        const lastM = monthly[monthly.length - 1];
        anomalyAlerts.push({
          metric: 'Faturamento Mensal',
          severity: Math.abs(changePct) > 35 ? 'critical' : 'warning',
          message: `Faturamento (${lastM.month}/${lastM.year}) está ${Math.abs(changePct)}% ${changePct < 0 ? 'abaixo' : 'acima'} da média histórica`,
          zScore: Math.round((changePct / 20) * 100) / 100,
        });
      }
    }

    const contextData: IntelligenceContextData = {
      channelRanking,
      monthly,
      kpis: {
        roas,
        cpl,
        receita: totalReceita,
        deals: totalDeals,
        ticketMedio,
        investGoogle,
        investMeta,
        totalInvest,
        receitaMidiaPaga,
      },
      googleProjection,
      anomalies: { totalAlerts: anomalyAlerts.length, alerts: anomalyAlerts },
    };

    const systemPrompt = buildIntelligencePrompt(contextData);

    // Chama Claude com streaming
    const stream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
      stream: true,
    });

    // Retorna ReadableStream para o frontend
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Intelligence chat error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
