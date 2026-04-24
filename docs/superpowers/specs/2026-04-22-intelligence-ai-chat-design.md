# Design: Chat IA na Página Inteligência

**Data:** 2026-04-22
**Status:** Aprovado

---

## Objetivo

Adicionar um chat com IA (Claude) no topo da página `/intelligence` do dashboard. O usuário faz perguntas em linguagem natural sobre os dados do período e recebe respostas com streaming em tempo real.

---

## O que NÃO muda

- Nenhuma rota de API existente é alterada
- Nenhum componente existente é modificado estruturalmente
- Os dados das seções (ChannelRanking, Temporal, etc.) continuam sendo buscados da mesma forma
- A lógica de `DateRangeFilter` e `useDashboardDateRange` permanece intacta
- Terminologia: usar sempre **ROAS** (não ROI)

---

## Arquitetura

### Novas peças

| Peça | Localização | Responsabilidade |
|------|-------------|-----------------|
| API Route | `src/app/api/ai/intelligence-chat/route.ts` | Busca dados, monta contexto, chama Claude com streaming |
| Componente | `src/components/intelligence-chat.tsx` | Barra de input, chips, área de resposta com stream |

### Peças existentes reativadas

| Peça | Arquivo | O que muda |
|------|---------|------------|
| `GoogleProjectionSection` | `intelligence/page.tsx` | Volta ao JSX (estava comentada) |
| `EfficiencySection` | `intelligence/page.tsx` | Volta ao JSX (estava comentada) |
| `AnomalySection` | `intelligence/page.tsx` | Volta ao JSX (estava comentada) |

---

## API Route: `POST /api/ai/intelligence-chat`

**Arquivo:** `src/app/api/ai/intelligence-chat/route.ts`

### Request

```json
{ "question": "Qual canal tem melhor ROAS?" }
```

### Comportamento

1. Busca dados internamente (não depende do frontend):
   - `getPipedriveData()` — histórico completo (sem filtro de data)
   - `blobGetJson('google-ads-data')` — investimento Google
   - `getMetaToken()` — se conectado, busca investimento Meta da API
   - `getSdrData()` — **não utilizado**

2. Monta system prompt em PT-BR com:
   - KPIs consolidados: ROAS, CPL, receita total, deals, ticket médio
   - Ranking de canais (top 10): canal, receita, deals, ticket médio, % da receita
   - Histórico mensal completo: receita e deals por mês
   - Projeção Google (se `hasEnoughData`)
   - Anomalias detectadas (status, z-score, mensagem)
   - Instrução de personalidade: analista de dados direto, em português, sem jargão técnico, sempre usa ROAS

3. Chama `claude-haiku-4-5-20251001` com streaming
   - Modelo leve e rápido — adequado para chat
   - Max tokens: 800 (resposta concisa)
   - Temperature: 0 (respostas factuais)

4. Retorna `ReadableStream` com `Content-Type: text/event-stream`

### Tratamento de erro

- Se `getPipedriveData()` retornar null → responde com erro 400 ("Nenhum dado importado ainda")
- Se Claude API falhar → erro 500 com mensagem amigável

---

## Componente: `IntelligenceChat`

**Arquivo:** `src/components/intelligence-chat.tsx`

### Props

```ts
interface Props {
  data: IntelligenceData; // dados já carregados pela página
}
```

### Estado interno

```ts
question: string          // input controlado
answer: string            // resposta acumulada do stream
loading: boolean          // stream em andamento
abortController: ref      // para cancelar o stream
```

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ 💬  [input: Pergunte sobre seus dados...]   [Enviar]    │
│     chip: "Qual canal tem melhor ROAS?"                 │
│     chip: "O que está causando as anomalias?"   (*)     │
│     chip: "Onde devo investir mais?"                    │
└─────────────────────────────────────────────────────────┘
(* chip de anomalia só aparece se data.anomalies.totalAlerts > 0)
(* chip de Google só aparece se data.googleProjection.hasEnoughData)
```

Após envio:
```
┌─────────────────────────────────────────────────────────┐
│ [nova pergunta...                           ] [Parar]   │
├─────────────────────────────────────────────────────────┤
│ Resposta aparece aqui token por token...                │
│ Suporta markdown básico (negrito, listas)               │
└─────────────────────────────────────────────────────────┘
```

### Chips dinâmicos

Gerados a partir do `data` recebido:

| Condição | Chip |
|----------|------|
| Sempre | "Qual canal tem melhor ROAS?" |
| Sempre | "Onde devo investir mais?" |
| `anomalies.totalAlerts > 0` | "O que está causando as anomalias?" |
| `googleProjection.hasEnoughData` | "Como está o ROAS do Google Ads?" |
| `efficiencyScores.length > 1` | "Compare Google Ads e Meta Ads" |

### Consumo do stream

```ts
const reader = res.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  setAnswer(prev => prev + decoder.decode(value));
}
```

Sem dependências novas — fetch nativo + hooks React existentes.

---

## Variável de ambiente necessária

```
ANTHROPIC_API_KEY=sk-ant-...
```

Já deve existir no projeto se Claude já é usado em outro lugar. Se não, precisa ser adicionada ao `.env.local` e ao ambiente de deploy.

---

## Ordem de implementação (segura)

1. Criar a rota API em isolamento e testar com `curl`
2. Criar o componente `IntelligenceChat` sem conectar à página ainda
3. Reativar as 3 seções removidas do JSX (`GoogleProjection`, `Efficiency`, `Anomaly`)
4. Inserir `<IntelligenceChat data={data} />` na página, logo após o header e antes das seções
5. Testar end-to-end

Cada passo é independente e reversível.

---

## Fora do escopo (não implementar agora)

- Histórico de conversa entre sessões
- Narrativa automática ao carregar a página
- Dados SDR no contexto
- Múltiplas perguntas em sequência com memória (cada envio é uma chamada nova)
