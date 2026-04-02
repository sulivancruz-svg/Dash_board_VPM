# Análise de Dados Reais — Planilhas Anexadas

## Arquivo SDR

### Estrutura
- **2 abas**: `2026` (Jan-Feb) e `2025` (May-Dec)
- **Seção A**: Resumo mensal agregado
  - Colunas: `Mês | Leads | Qualificados | Venda`
  - 2026: 307 leads jan, 232 leads fev
  - 2025: 1.217 leads (mai-dez) total
- **Seção B**: Detalhe de vendas individuais
  - Colunas: `Cliente | Veio Por | Mês Entrada | Mês Fechamento | Mês da Viagem | Valor`
  - Contém nomes de clientes (LGPD: considerar anonimização)
  - Campo **Mês da Viagem** é único — receita não = mês de fechamento

### Estatísticas
- 2026: 539 leads, 65 qualificados (12%), 10 vendas (15% conversão)
- 2025: 1.217 leads, 170 qualificados (14%), 29 vendas (17% conversão)
- Taxa de qualificação média: **~12-14%**
- Taxa qualificado → venda: **~15%**

### Canais Encontrados (Veio Por)
- `Google` → Google Ads
- `Indicação Cliente VPM` → Indicação
- `Cliente VPM, entrou em contato` → Clientes VPM - Retorno
- `Instagram` → Meta - Instagram
- `Passante / Google` → Loja Física / Google
- `Campanha Chile` → Campanha específica (não mapeada no Pipedrive)
- `Cliente entrou por whatsapp` → WhatsApp
- Outros variantes e combinações

### Gap Crítico
A **seção de resumo mensal não tem canal** — é apenas total. O canal só aparece nas vendas fechadas. **Não é possível calcular taxa de qualificação por canal** com base nesses dados. Seria necessário:
- Planilha de leads recebidos por canal (não só vendas)
- Planilha de leads qualificados por canal
- Histórico de qualificações por lead (não só totais mensais)

---

## Arquivo Pipedrive

### Estrutura
- **3 abas**:
  1. `Cruzamento Ganho` — resumo geral dos deals ganhos
  2. `Com Faturamento Monde` — 520 deals com receita confirmada
  3. `Sem Faturamento Monde` — 962 deals sem receita no Monde
- **Colunas**: `Negócio - ID | Canal de Entrada | Status | Deal (Monde) | Faturamento Total (R$)`

### Estatísticas
- **Total deals ganhos**: 1.482
- **Com faturamento Monde**: 520 (35,1%)
- **Sem faturamento Monde**: 962 (64,9%) ⚠️
- **Faturamento total confirmado**: R$ 13.750.503

### Gap Crítico
**65% dos deals ganhos não têm faturamento registrado no Monde.** Possíveis causas:
- Deals marcados como ganhos antes de processo de pagamento concluído
- Deals cancelados após marcação como ganho
- Problema de integração Pipedrive ↔ Monde
- Vendas em parcelas ainda abertas

**Impacto**: Qualquer análise de receita pelo Pipedrive está superestimada. A fonte de verdade para receita deve ser o **Monde, não o Pipedrive**.

### Canais (Canal de Entrada)

**Top 5 por receita**:
1. `Espontaneamente - Cliente VPM Fez Contato` — 906 deals | R$ 8.883.507 | ticket: R$ 25.899
2. `Indicação - Indicado por um Cliente VPM` — 207 deals | R$ 2.077.270 | ticket: R$ 31.474
3. `Networking - Relacionamentos Pessoais` — 68 deals | R$ 650.771 | ticket: R$ 25.030
4. `Prospecção Agente - Agente Provocou o Contato` — 36 deals | R$ 520.548 | ticket: R$ 57.839 ⭐
5. `Google` — 27 deals | R$ 388.941 | ticket: R$ 27.782

**Insights**:
- Clientes que voltam = 64,5% da receita total
- Indicação tem maior ticket que Google (R$ 31k vs R$ 27k)
- Prospecção Ativa tem **maior ticket de todos** (R$ 57.8k) — subaproveitado?
- Meta - Instagram tem 27 deals mas só R$ 69k (ticket: R$ 23k) — **qualidade baixa**

### Nomes de Canais (Discrepâncias com SDR)
- Pipedrive: `Espontaneamente - Cliente VPM Fez Contato` = SDR: `Cliente VPM, entrou em contato`
- Pipedrive: `Indicação - Indicado por um Cliente VPM` = SDR: `Indicação Cliente VPM`, `Indicação`
- Pipedrive: `Redes Sociais - Facebook ou Instagram` = SDR: `Instagram`
- Pipedrive: `Passante (Loja Física)` ≠ SDR: `Passante / Google` (pode ser mix)

---

## Achados Estratégicos

### 1. Receita Real ≠ Pipedrive
Deve-se usar **Monde como fonte primária** de receita, não Pipedrive. O Pipedrive têm 65% de gap.

### 2. "Mês da Viagem" é Campo Crítico
Diferente de "Mês Fechamento", a viagem pode ser meses depois da venda.
- Deal fechado em Janeiro para viagem em Julho
- Influencia pipeline, cash flow e reconhecimento de receita

### 3. Clientes VPM = Retenção & Upsell
Maior volume (906 deals) + receita dominante (64,5%) = principal motor do negócio.
Este é um canal de **retenção**, não de aquisição.

### 4. Indicação tem Qualidade
Taxa de qualificação implícita (vendas % de leads): 11/45 = **24%** (vs. 2% média)
Maior ticket que Google. Recomendação: ampliar investimento em programa de indicação.

### 5. Meta está Subaproveitado ou Gerando Leads Ruins
- 27 deals no Pipedrive
- Só R$ 69k receita
- Ticket de R$ 23k (metade da média)

Possíveis causas:
- Targeting muito amplo (baixa qualidade)
- Copy/creative não adequado para público com poder de compra
- Não é volume, é qualidade (problema)

### 6. Google Ads Parece Eficiente
- 27 deals (similar a Meta)
- R$ 388k receita (5,6x mais que Meta)
- Ticket R$ 27k (ligeiramente acima da média)
- Recomendação: aumentar verba, monitorar para manter eficiência

### 7. Prospecção Ativa é Diamante Escondido
- Apenas 36 deals
- Maior ticket: R$ 57.8k
- Volume pode estar limitado por recursos humanos
- Recomendação: ampliar equipe de prospecção

---

## Cruzamento SDR ↔ Pipedrive

### Problema de Unificação
Os dados não podem ser cruzados facilmente porque:
1. **Canais têm nomes diferentes** — normalização necessária
2. **Granularidade diferente** — SDR tem vendas individuais, Pipedrive tem agregado
3. **Fonte de receita diferente** — SDR tem valores de viagem, Pipedrive tem valores do deal
4. **Não há ID comum** — SEM identificador único de lead que possa unificar

### Fórmula Proposta
- SDR: `Veio Por` → normalizar → `Clientes VPM - Retorno`
- Pipedrive: `Canal de Entrada` → normalizar → `Espontaneamente - Cliente VPM Fez Contato`
- **Match**: Ambos normals para `Clientes VPM - Retorno`

Mas sem ID de lead único, não há garantia de que o mesmo cliente está em ambas as tabelas.

---

## Recomendações para Próximas Exportações

### SDR
- [ ] Adicionar campo de `ID do Lead` (único)
- [ ] Incluir `Status do Lead` (QUALIFIED, DISQUALIFIED, NO_CONTACT, etc.)
- [ ] Adicionar `Motivo de Desqualificação` (quando status = DISQUALIFIED)
- [ ] Incluir `Data de Primeiro Contato` (não só mês)
- [ ] Adicionar `Data de Qualificação` (exato, não só mês)
- [ ] Canal para **todos** os leads, não só vendas fechadas

### Pipedrive
- [ ] Exportar também deals **PERDIDOS** com motivo
- [ ] Adicionar campo de **data de criação** do deal
- [ ] Adicionar **valor estimado** (vs. faturamento real)
- [ ] Incluir **responsável/vendedor**
- [ ] Adicionar **ID do lead** (para rastreabilidade)
- [ ] Exportar deals em **ABERTO** por etapa (pipeline atual)

---

## Dados Que Faltam

Para uma análise completa e em tempo real seria necessário:

1. **Meta Ads API** — Campanhas, adsets, criativos, insights em tempo real
2. **UTM Tracking** — Rastrear qual campanha Meta gerou qual lead
3. **Google Analytics 4** — Comportamento pós-click, busca orgânica
4. **Pesquisa de Marca** — Brand awareness, recall, consideração (real, não proxies)
5. **CRM com Timestamps** — Data/hora exata de cada evento (lead, qualificação, oportunidade)
6. **ID Unificado** — Lead ID que atravessa todas as plataformas
7. **Dados de Viagem Real** — Mongode quando as viagens realmente ocorrem (não só calendário)

---

## Conclusão

O dashboard MVP pode ser construído com os dados disponíveis, mas com as seguintes limitações:

✅ **Possível**:
- Visão de receita por canal (via Pipedrive + Monde)
- Funil de vendas (leads → qualificados → oportunidades → vendas)
- Análise de canais por valor gerado
- Alertas sobre gaps de dados

❌ **Não Possível Agora**:
- Funil completo por canal (qualificação não tem canal)
- CAC por campanha Meta (sem UTM/rastreamento)
- ROAS real (sem investimento por canal mapeado)
- Branding analysis (sem brand lift)
- Atribuição multi-touch (sem IDs unificados)

**Recomendação**: Começar com MVP usando dados disponíveis, depois evoluir para integrações com APIs e melhoria de coleta de dados nas planilhas.
