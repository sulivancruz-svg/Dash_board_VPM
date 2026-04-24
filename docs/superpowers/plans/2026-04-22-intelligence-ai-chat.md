# Intelligence AI Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um chat com IA (Claude, streaming) no topo da página `/intelligence`, com barra de input e chips de sugestão contextuais.

**Architecture:** Nova API route POST `/api/ai/intelligence-chat` busca todos os dados internamente, monta um system prompt com contexto completo e chama Claude com streaming. Um novo componente React consome o stream e renderiza a resposta token por token. A página recebe o componente logo após o header, sem alterar nenhuma lógica existente.

**Tech Stack:** Next.js 14 App Router, `@anthropic-ai/sdk`, Jest + ts-jest

---

## File Map

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `src/lib/ai/intelligence-context.ts` | Função pura que recebe dados e retorna o prompt para Claude |
| Criar | `src/app/api/ai/intelligence-chat/route.ts` | POST handler: busca dados, chama Claude com streaming |
| Criar | `src/components/intelligence-chat.tsx` | Barra de input + chips + render do stream |
| Criar | `src/__tests__/intelligence-context.test.ts` | Testes da função de contexto |
| Modificar | `src/app/intelligence/page.tsx` | Reativar 3 seções removidas + inserir `<IntelligenceChat>` |

---

## Task 1: Instalar `@anthropic-ai/sdk` e configurar `ANTHROPIC_API_KEY`

**Files:**
- Modify: `package.json` (via npm)
- Create: `.env.local` (se não existir)

- [ ] **Step 1: Instalar o SDK**

```bash
cd "C:/Users/suliv/OneDrive/Área de Trabalho/dash/dashboard"
npm install @anthropic-ai/sdk
```

Expected: `added 1 package` (ou similar), sem erros.

- [ ] **Step 2: Adicionar a chave ao .env.local**

Abrir (ou criar) `.env.local` na raiz do projeto e adicionar:

```
ANTHROPIC_API_KEY=sk-ant-...
```

> Substituir pelo valor real da chave. Não commitar este arquivo.

- [ ] **Step 3: Confirmar que o servidor ainda sobe normalmente**

```bash
npm run dev
```

Expected: servidor sobe na porta 3002 sem erros relacionados a env ou dependências.

- [ ] **Step 4: Parar o servidor (Ctrl+C) e commitar só o lock file**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk"
```

---

## Task 2: Criar o context builder (função pura)

**Files:**
- Create: `src/lib/ai/intelligence-context.ts`
- Create: `src/__tests__/intelligence-context.test.ts`

Esta função é a única lógica de IA que vale testar isoladamente — ela é pura e não faz I/O.

- [ ] **Step 1: Escrever o teste antes da implementação**

Criar `src/__tests__/intelligence-context.test.ts`:

```ts
import { buildIntelligencePrompt } from '@/lib/ai/intelligence-context';

const baseData = {
  channelRanking: [
    { canal: 'Google Ads', attribution: 'PAID_MEDIA', receita: 150000, deals: 10, ticketMedio: 15000, pctReceita: 60 },
    { canal: 'Indicação', attribution: 'ORGANIC_COMMERCIAL', receita: 80000, deals: 8, ticketMedio: 10000, pctReceita: 32 },
  ],
  monthly: [
    { monthKey: '2025-12', month: 'dez', year: 2025, receita: 80000, deals: 6 },
    { monthKey: '2026-01', month: 'jan', year: 2026, receita: 90000, deals: 7 },
    { monthKey: '2026-02', month: 'fev', year: 2026, receita: 100000, deals: 8 },
  ],
  kpis: {
    roas: 3.2,
    cpl: 1800,
    receita: 250000,
    deals: 18,
    ticketMedio: 13888,
  },
  googleProjection: { hasEnoughData: true, roiHistorico: 3.2, r2: 0.87 },
  anomalies: {
    totalAlerts: 1,
    alerts: [{ metric: 'Receita Mensal', severity: 'warning', message: 'Receita (fev/2026) está 22% abaixo da média histórica', zScore: -1.4 }],
  },
};

describe('buildIntelligencePrompt', () => {
  it('inclui os canais no prompt', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('Google Ads');
    expect(prompt).toContain('Indicação');
  });

  it('menciona ROAS e não ROI', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('ROAS');
    expect(prompt).not.toContain(' ROI ');
  });

  it('inclui histórico mensal', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('jan/2026');
    expect(prompt).toContain('fev/2026');
  });

  it('inclui alerta de anomalia quando presente', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('abaixo da média histórica');
  });

  it('não menciona SDR', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).not.toContain('SDR');
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
npm test -- --testPathPattern=intelligence-context
```

Expected: FAIL com `Cannot find module '@/lib/ai/intelligence-context'`

- [ ] **Step 3: Criar o arquivo `src/lib/ai/intelligence-context.ts`**

```ts
// src/lib/ai/intelligence-context.ts

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const NUM = (v: number) => v.toLocaleString('pt-BR');

export interface IntelligenceContextData {
  channelRanking: Array<{
    canal: string;
    attribution: string;
    receita: number;
    deals: number;
    ticketMedio: number;
    pctReceita: number;
  }>;
  monthly: Array<{
    monthKey: string;
    month: string;
    year: number;
    receita: number;
    deals: number;
  }>;
  kpis: {
    roas: number | null;
    cpl: number | null;
    receita: number;
    deals: number;
    ticketMedio: number;
  };
  googleProjection: {
    hasEnoughData: boolean;
    roiHistorico: number;
    r2: number;
  };
  anomalies: {
    totalAlerts: number;
    alerts: Array<{
      metric: string;
      severity: string;
      message: string;
      zScore: number;
    }>;
  };
}

export function buildIntelligencePrompt(data: IntelligenceContextData): string {
  const lines: string[] = [];

  lines.push('Você é um analista de dados de uma agência de viagens premium no Brasil.');
  lines.push('Responda sempre em português, de forma direta e objetiva, sem jargão técnico.');
  lines.push('Quando falar de retorno sobre investimento em mídia paga, use sempre "ROAS" (nunca "ROI").');
  lines.push('');

  // KPIs
  lines.push('## KPIs do período');
  lines.push(`- Receita total: ${BRL(data.kpis.receita)}`);
  lines.push(`- Deals fechados: ${NUM(data.kpis.deals)}`);
  lines.push(`- Ticket médio: ${BRL(data.kpis.ticketMedio)}`);
  if (data.kpis.roas !== null) lines.push(`- ROAS (mídia paga): ${data.kpis.roas}x`);
  if (data.kpis.cpl !== null) lines.push(`- CPL (custo por lead): ${BRL(data.kpis.cpl)}`);
  lines.push('');

  // Ranking de canais
  lines.push('## Canais de origem (por ticket médio)');
  for (const ch of data.channelRanking.slice(0, 10)) {
    lines.push(`- ${ch.canal}: receita ${BRL(ch.receita)}, ${ch.deals} deals, ticket médio ${BRL(ch.ticketMedio)}, ${ch.pctReceita}% do faturamento`);
  }
  lines.push('');

  // Histórico mensal
  lines.push('## Histórico mensal (receita e deals)');
  for (const m of data.monthly) {
    lines.push(`- ${m.month}/${m.year}: ${BRL(m.receita)}, ${m.deals} deals`);
  }
  lines.push('');

  // Projeção Google
  if (data.googleProjection.hasEnoughData) {
    lines.push('## Projeção Google Ads');
    lines.push(`- ROAS histórico Google: ${data.googleProjection.roiHistorico}x`);
    lines.push(`- Confiança da regressão (R²): ${data.googleProjection.r2}`);
    lines.push('');
  }

  // Anomalias
  if (data.anomalies.totalAlerts > 0) {
    lines.push('## Alertas de anomalia detectados');
    for (const a of data.anomalies.alerts) {
      lines.push(`- [${a.severity.toUpperCase()}] ${a.message} (z=${a.zScore}σ)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
npm test -- --testPathPattern=intelligence-context
```

Expected: 5 testes passando, 0 falhas.

- [ ] **Step 5: Commitar**

```bash
git add src/lib/ai/intelligence-context.ts src/__tests__/intelligence-context.test.ts
git commit -m "feat: add intelligence context builder with tests"
```

---

## Task 3: Criar a API Route com streaming

**Files:**
- Create: `src/app/api/ai/intelligence-chat/route.ts`

> Esta rota não tem teste automatizado — streaming é difícil de testar em Jest. Testamos manualmente com curl.

- [ ] **Step 1: Criar o arquivo da rota**

Criar `src/app/api/ai/intelligence-chat/route.ts`:

```ts
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

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = body?.question ?? '';

    if (!question.trim()) {
      return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
    }

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

    // Projeção Google (r2 e roiHistorico — dados simples)
    const googleProjection: IntelligenceContextData['googleProjection'] = {
      hasEnoughData: (googleAdsData?.months?.length ?? 0) >= 3,
      roiHistorico: investGoogle > 0 ? Math.round((receitaMidiaPaga / investGoogle) * 100) / 100 : 0,
      r2: 0, // simplificado — a rota /intelligence já calcula o r2 completo
    };

    // Anomalias — usa histórico mensal simples (sem recalcular z-score aqui)
    // Detecta queda abrupta no último mês vs média
    const anomalyAlerts: IntelligenceContextData['anomalies']['alerts'] = [];
    if (monthly.length >= 3) {
      const receitas = monthly.map(m => m.receita);
      const mean = receitas.reduce((a, b) => a + b, 0) / receitas.length;
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
      max_tokens: 800,
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
```

- [ ] **Step 2: Subir o servidor e testar com curl**

```bash
npm run dev
```

Em outro terminal:

```bash
curl -X POST http://localhost:3002/api/ai/intelligence-chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Qual canal tem melhor ROAS?"}' \
  --no-buffer
```

Expected: texto em português aparecendo progressivamente no terminal, sem erros JSON.

Se retornar `{"error":"Nenhum dado importado ainda"}`, é porque o ambiente local não tem dados — isso é normal. O componente frontend vai tratar esse caso.

- [ ] **Step 3: Parar o servidor e commitar**

```bash
git add src/app/api/ai/intelligence-chat/route.ts
git commit -m "feat: add intelligence AI chat API route with streaming"
```

---

## Task 4: Criar o componente `IntelligenceChat`

**Files:**
- Create: `src/components/intelligence-chat.tsx`

- [ ] **Step 1: Criar o componente**

Criar `src/components/intelligence-chat.tsx`:

```tsx
'use client';

import { useState, useRef } from 'react';
import { Brain, Send, Square, Loader } from 'lucide-react';
import type { IntelligenceData } from '@/app/api/data/intelligence/route';

interface Props {
  data: IntelligenceData;
}

function buildChips(data: IntelligenceData): string[] {
  const chips: string[] = ['Qual canal tem melhor ROAS?', 'Onde devo investir mais?'];
  if (data.anomalies.totalAlerts > 0) chips.push('O que está causando as anomalias?');
  if (data.googleProjection.hasEnoughData) chips.push('Como está o ROAS do Google Ads?');
  if (data.efficiencyScores.length > 1) chips.push('Compare Google Ads e Meta Ads');
  return chips;
}

export function IntelligenceChat({ data }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState('');
  const [loading, setLoading]   = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const chips = buildChips(data);

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;

    setQuestion('');
    setAnswer('');
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai/intelligence-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        setAnswer(`⚠️ ${err.error ?? 'Erro ao processar pergunta'}`);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAnswer(accumulated);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setAnswer('⚠️ Não foi possível conectar com a IA. Tente novamente.');
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
      {/* Input */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit(question)}
            placeholder="Pergunte sobre seus dados..."
            disabled={loading}
            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition disabled:opacity-50"
          />
          {loading ? (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
            >
              <Square className="w-3.5 h-3.5" />
              Parar
            </button>
          ) : (
            <button
              onClick={() => submit(question)}
              disabled={!question.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </button>
          )}
        </div>

        {/* Chips — só exibe se não há resposta em andamento */}
        {!answer && !loading && (
          <div className="flex flex-wrap gap-2 mt-2.5 pl-9">
            {chips.map(chip => (
              <button
                key={chip}
                onClick={() => submit(chip)}
                className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full hover:bg-indigo-100 transition"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resposta */}
      {(answer || loading) && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
          {loading && !answer && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader className="w-3.5 h-3.5 animate-spin" />
              Analisando dados...
            </div>
          )}
          {answer && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {answer}
              {loading && <span className="inline-block w-1 h-3.5 bg-indigo-500 animate-pulse ml-0.5 align-middle" />}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que não há erros de TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros. Se houver erro de tipo em `IntelligenceData`, verificar se o import está correto apontando para `@/app/api/data/intelligence/route`.

- [ ] **Step 3: Commitar**

```bash
git add src/components/intelligence-chat.tsx
git commit -m "feat: add IntelligenceChat component with streaming"
```

---

## Task 5: Integrar o componente na página

**Files:**
- Modify: `src/app/intelligence/page.tsx`

Esta task tem duas partes: reativar as 3 seções removidas do JSX e inserir o `<IntelligenceChat>`.

- [ ] **Step 1: Adicionar o import do componente**

No topo de `src/app/intelligence/page.tsx`, após os imports existentes, adicionar:

```ts
import { IntelligenceChat } from '@/components/intelligence-chat';
```

- [ ] **Step 2: Reativar as 3 seções no JSX**

Localizar o bloco ao final do arquivo (por volta da linha 634):

```tsx
      {!loading && !error && data?.hasData && (
        <>
          <ChannelRankingSection    channels={data.channelRanking} />
          <TemporalSection          channels={data.temporalByChannel} allMonthKeys={data.allMonthKeys} />
        </>
      )}
```

Substituir por:

```tsx
      {!loading && !error && data?.hasData && (
        <>
          <IntelligenceChat data={data} />
          <ChannelRankingSection    channels={data.channelRanking} />
          <TemporalSection          channels={data.temporalByChannel} allMonthKeys={data.allMonthKeys} />
          <GoogleProjectionSection  proj={data.googleProjection} />
          <EfficiencySection        scores={data.efficiencyScores} />
          <AnomalySection           anomalies={data.anomalies} />
        </>
      )}
```

> As seções `GoogleProjectionSection`, `EfficiencySection` e `AnomalySection` já existem no arquivo (linhas 269–551) — apenas estavam fora do JSX. Não precisam ser criadas.

- [ ] **Step 3: Subir o servidor e testar visualmente**

```bash
npm run dev
```

Abrir `http://localhost:3002/intelligence` no browser.

Verificar:
- [ ] Barra de chat aparece no topo, abaixo do header
- [ ] Chips de sugestão aparecem
- [ ] Clicar num chip dispara a pergunta e mostra resposta em streaming
- [ ] As 3 seções reativadas (Projeção Google, Eficiência, Anomalias) aparecem abaixo do heatmap
- [ ] As seções existentes (Ranking, Heatmap) continuam funcionando normalmente
- [ ] O `DateRangeFilter` continua funcionando

- [ ] **Step 4: Commitar**

```bash
git add src/app/intelligence/page.tsx
git commit -m "feat: integrate AI chat into intelligence page, reactivate hidden sections"
```

---

## Checklist de verificação final

- [ ] `npm test` roda sem erros
- [ ] `npx tsc --noEmit` sem erros
- [ ] Chat responde em streaming no browser
- [ ] Botão "Parar" cancela o stream
- [ ] Chips mudam conforme os dados (anomalias, Google)
- [ ] Seções Projeção, Eficiência e Anomalias visíveis na página
- [ ] Nenhuma outra página do dashboard foi afetada
