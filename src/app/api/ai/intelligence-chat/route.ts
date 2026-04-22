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

    if (!question.trim()) {
      return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Busca dados internamente — histórico completo, sem filtro de data
    const [pipedriveData, googleAdsData, metaToken] = await Promise.all([
      getPipedriveData(),
      blobGetJson<GoogleAdsStoredData>('google-ads-data'),
      getMetaToken(),
    ]);

    if (!pipedriveData) {
      return NextResponse.json({ error: 'Nenhum dado importado ainda' }, { status: 400 });
    }

    const metrics = getPipedriveMetricsForRange(pipedriveData, undefined); // histórico completo
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
    const investGoogle = googleAdsData?.totalSpend ?? 0;

    let investMeta = 0;
    if (metaToken?.token && metaToken?.accountId) {
      try {
        const url = new URL(`https://graph.facebook.com/v20.0/${metaToken.accountId}/insights`);
        url.searchParams.append('access_token', metaToken.token);
        url.searchParams.append('fields', 'spend');
        url.searchParams.append('date_preset', 'last_90d');
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          investMeta = parseFloat(data.data?.[0]?.spend ?? '0');
        }
      } catch {
        // ignora falha do Meta, segue sem ele
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
          metric: 'Receita Mensal',
          severity: Math.abs(changePct) > 35 ? 'critical' : 'warning',
          message: `Receita (${lastM.month}/${lastM.year}) está ${Math.abs(changePct)}% ${changePct < 0 ? 'abaixo' : 'acima'} da média histórica`,
          zScore: Math.round((changePct / 20) * 100) / 100,
        });
      }
    }

    const contextData: IntelligenceContextData = {
      channelRanking,
      monthly,
      kpis: { roas, cpl, receita: totalReceita, deals: totalDeals, ticketMedio },
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
    console.error('Intelligence chat error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Erro ao processar pergunta' }, { status: 500 });
  }
}
