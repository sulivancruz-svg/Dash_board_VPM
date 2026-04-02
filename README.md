# Marketing Dashboard

Dashboard estratégico de Marketing & Receita — Análise integrada de campanhas, SDR, pipeline comercial e receita.

## Estrutura

- **Visão Executiva** — KPIs, alertas e resumo estratégico do período
- **Mídia Paga** — Campanhas Meta, criativos, fadiga, saturação
- **Funil Comercial** — Análise da jornada completa (lead → venda → receita)
- **Canais & Receita** — Comparação de canais, ROI, CAC, matriz de investimento
- **Branding Estratégico** — Proxies de construção de marca e análise de longo prazo
- **Configurações** — Integração Meta API, upload de planilhas, mapeamento de canais

## Setup

### 1. Configurar Variáveis de Ambiente

```bash
cp .env.example .env.local
```

Editar `.env.local`:
- `ENCRYPTION_KEY`: Chave de 32 caracteres para criptografia do token Meta
  - Gerar com: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
- `DATABASE_URL`: String de conexão PostgreSQL

### 2. Estender Schema Prisma

O schema Prisma já foi estendido com as tabelas de marketing:

```bash
cd ../web
npx prisma migrate dev --name add_marketing_tables
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Rodar Servidor de Desenvolvimento

```bash
npm run dev
```

Acessar em `http://localhost:3002`

## Integrações

### Meta Ads API

1. Ir para **Configurações** → **Meta Ads API**
2. Inserir Business Use Case Token (System User Token)
3. Validar e conectar
4. Token é criptografado no banco de dados, nunca exposto no frontend

### Upload de Planilhas

#### SDR (Leads & Vendas)

- Formato: Duas seções na mesma aba
  - **Resumo**: Mês | Leads | Qualificados | Venda
  - **Detalhe**: Cliente | Veio Por | Mês Entrada | Mês Fechamento | Mês da Viagem | Valor

#### Pipedrive (Deals & Receita)

- Formato: Negócio - ID | Canal de Entrada | Status | Deal (Monde) | Faturamento Total (R$)
- 3 abas automáticamente processadas:
  - Cruzamento Ganho
  - Com Faturamento Monde
  - Sem Faturamento Monde

## Arquitetura

### Frontend (Next.js)
- Pages: Visão Executiva, Mídia Paga, Funil, Canais, Branding, Configurações
- Componentes: KPI Cards, Alert Panel, Funnel Table, Charts (Recharts)
- State: Zustand (client-side), React Query (server state)

### Backend (API Routes)
- `/api/meta/connect` — Validar e conectar token Meta
- `/api/imports/sdr` — Processar upload SDR
- `/api/imports/pipedrive` — Processar upload Pipedrive
- `/api/dashboard/*` — Endpoints de dados do dashboard

### ETL (Parsing & Normalização)
- `lib/etl/sdr-parser.ts` — Parse de planilha SDR
- `lib/etl/pipedrive-parser.ts` — Parse de planilha Pipedrive
- `lib/channel-mapping.ts` — Normalização de canais
- `lib/crypto.ts` — Criptografia de tokens

### Database (Prisma + PostgreSQL)
- `meta_integrations` — Tokens Meta criptografados
- `meta_campaigns`, `meta_adsets`, `meta_ads`, `meta_creatives`, `meta_insights`
- `pipedrive_imports`, `pipedrive_deals`
- `sdr_imports`, `sdr_monthly_summary`, `sdr_leads`
- `channel_mapping` — Normalização de canais

## Métricas Calculadas

### Operacionais
- Investimento, impressões, cliques, CTR, CPC, CPM, resultados, custo/resultado

### Táticas
- CPL (custo por lead), taxa de qualificação, taxa de avanço SDR, ticket médio

### Estratégicas
- CAC (custo de aquisição), ROI por canal, participação de receita, pipeline velocity

### De Negócio
- Receita total, receita por canal, vendas por canal, % receita de mídia paga

### Branding
- Alcance único, frequência, video completion rate (proxies com limitações declaradas)

## Limitações & Gaps

### Dados Atuais
- ✅ Funil SDR (total mensal)
- ✅ Vendas fechadas com canal e valor
- ✅ Receita confirmada pelo Monde (520/1482 deals = 35%)
- ❌ Canal para leads/qualificados (só resumo total)
- ❌ Motivos de desqualificação
- ❌ Tempo de resposta SDR

### Gaps Críticos
1. **65% dos deals no Pipedrive sem faturamento no Monde** — problema de integração ou processo
2. **Sem UTM/campanha no lead** — não é possível atribuir lead a campanha Meta específica
3. **Sem pesquisa de marca** — métricas de branding são proxies imperfeitas

### Para Próximas Fases
- Integração real com Meta Ads API
- Google Ads API integration
- Google Analytics 4 para busca orgânica
- Pesquisa de brand lift (tracking real de brand awareness)
- API direta do Pipedrive (dados em tempo real)
- Cálculo de attribution window assistido

## Segurança

- Token Meta: **criptografado AES-256-GCM** com IV aleatório
- Token nunca exposição no frontend
- Nomes de clientes no SDR: **hashear ou omitir** antes de análise
- LGPD: considerar anonimização de dados pessoais

## Próximos Passos (Fase 2+)

1. **Fase 2**: Integração Meta Ads API (campanhas, insights, criativos em tempo real)
2. **Fase 3**: Análise avançada (fadiga criativa, saturação, recomendações)
3. **Fase 4**: Alertas automáticos e export de relatórios
4. **Fase 5**: Inteligência e projeção (attribution, forecasting, recomendações)

---

**Status**: MVP funcional com visão executiva e setup de integrações.
