# MVP Dashboard de Marketing e Receita

## 1. Visao do produto e objetivo do dashboard

Este dashboard deve ser um painel executivo para dono de negocio.

O objetivo nao e aprofundar analises tecnicas de trafego, e sim responder com clareza:

- quanto foi investido no Meta Ads
- onde esse investimento esta concentrado
- quais canais estao gerando vendas fechadas
- quanto de receita cada canal esta trazendo
- se o investimento em marketing faz sentido olhando para o retorno comercial

O dashboard conecta duas camadas:

- Meta Ads: investimento, distribuicao da verba e performance de campanhas, conjuntos, anuncios e criativos
- Pipedrive + Monde: vendas fechadas, receita e consolidacao por canal

O foco do MVP e simplicidade, leitura rapida e tomada de decisao.

## 2. Estrutura do painel

O painel deve ter 4 paginas.

### 2.1 Visao Geral

Pagina principal para leitura executiva.

Blocos:

- investimento total no Meta no periodo
- vendas fechadas totais
- receita total
- ticket medio geral
- top canais por receita
- top canais por volume de vendas
- resumo executivo do periodo
- alertas estrategicos

Perguntas que essa pagina deve responder:

- estamos investindo quanto?
- estamos vendendo quanto?
- quem esta trazendo receita?
- a relacao investimento x resultado parece saudavel?

### 2.2 Meta Ads

Pagina focada em leitura de midia, mas com linguagem executiva.

Blocos:

- investimento nos ultimos 7, 14 e 30 dias
- comparacao com periodo anterior
- tabela por campanha
- tabela por conjunto
- tabela por anuncio
- tabela por criativo
- destaques de melhor desempenho
- destaques de pior desempenho
- concentracao de verba

Perguntas que essa pagina deve responder:

- onde a verba esta sendo colocada?
- quais campanhas mais receberam investimento?
- quais criativos performaram melhor?
- existe concentracao excessiva em poucas campanhas?

### 2.3 Marketing + Vendas

Pagina de consolidacao dos resultados comerciais por canal.

Blocos:

- vendas fechadas por canal
- receita por canal
- ticket medio por canal
- participacao percentual de cada canal na receita total
- ranking de canais
- comparacao entre canais

Perguntas que essa pagina deve responder:

- quais canais realmente fecham venda?
- quais canais geram mais receita?
- quais canais trazem maior ticket medio?

### 2.4 Configuracoes

Pagina operacional do sistema.

Blocos:

- conexao segura com Meta Ads
- upload de planilha Pipedrive
- upload de planilha Monde ou cruzamento Pipedrive/Monde
- status de processamento
- data da ultima atualizacao

## 3. Metricas principais

O MVP deve priorizar poucas metricas, com alta utilidade para decisao.

### 3.1 KPIs da Visao Geral

- investimento total Meta
- vendas fechadas totais
- receita total
- ticket medio geral
- quantidade de canais ativos
- canal lider em receita
- ROI simples, quando houver base confiavel
- CAC simples, quando houver base confiavel

### 3.2 KPIs de Meta Ads

- investimento
- investimento 7 dias
- investimento 14 dias
- investimento 30 dias
- variacao versus periodo anterior
- impressoes
- alcance
- frequencia
- CTR
- CPC
- CPM
- resultados
- custo por resultado

### 3.3 KPIs de Marketing + Vendas

- vendas fechadas por canal
- receita por canal
- ticket medio por canal
- participacao do canal na receita total
- ranking por receita
- ranking por quantidade de vendas

### 3.4 Leituras derivadas

Mostrar apenas quando os dados forem confiaveis:

- receita / investimento
- custo por venda fechada
- concentracao da verba nas top campanhas
- concentracao da receita nos top canais

## 4. Logica de integracao com Meta Ads

## 4.1 Area segura para token

Fluxo recomendado:

1. Usuario insere o token
2. Sistema valida o token na Meta
3. Sistema lista a conta ou contas de ads disponiveis
4. Usuario escolhe a conta principal
5. Sistema salva a configuracao de forma segura

Requisitos:

- token nunca deve voltar em resposta da API
- token nunca deve ser logado
- token deve ser armazenado criptografado
- descriptografia apenas no momento da chamada para a Meta

Observacao sobre o estado atual:

- a base existente ja tem endpoint de conexao
- o MVP atual ainda precisa evoluir o armazenamento do token para criptografia real em vez de persistencia simples em arquivo

## 4.2 Sincronizacao de dados

Para o MVP, a sincronizacao deve ser manual.

Acao recomendada:

- botao `Atualizar dados Meta`

Isso reduz complexidade operacional. Cron e automacao ficam para fase posterior.

## 4.3 Dados minimos buscados da Meta

- campanhas
- conjuntos de anuncios
- anuncios
- criativos
- investimento
- impressoes
- alcance
- frequencia
- CTR
- CPC
- CPM
- resultados
- custo por resultado

## 4.4 Janelas de tempo

No MVP, usar:

- ultimos 7 dias
- ultimos 14 dias
- ultimos 30 dias

## 4.5 Leitura executiva automatica

O dashboard deve destacar:

- campanhas com maior investimento
- campanhas com melhor desempenho
- campanhas com pior desempenho
- criativos com melhor CTR
- criativos com pior custo por resultado
- sinais de concentracao de verba

## 5. Logica de upload e leitura das planilhas

O upload deve ser simples para o usuario e rigido no backend.

## 5.1 Fluxo de upload

1. Usuario envia arquivo
2. Backend valida tipo e estrutura
3. Parser extrai colunas necessarias
4. Dados sao normalizados
5. Canais sao padronizados
6. Resumos ficam disponiveis para o dashboard

## 5.2 Pipedrive

Colunas minimas esperadas:

- identificador do deal
- canal de origem
- status
- data de fechamento, se existir
- valor, se existir
- referencia Monde, se existir

Uso no sistema:

- volume de vendas fechadas
- origem por canal
- apoio para consolidacao comercial

## 5.3 Monde

Colunas minimas esperadas:

- identificador do cliente ou venda
- receita ou faturamento
- data
- canal, se existir
- referencia ao deal, se existir

Uso no sistema:

- receita confirmada
- consolidacao financeira por canal

## 5.4 Regra de negocio recomendada

Se Monde for a fonte mais confiavel para faturamento:

- Pipedrive deve ser tratado como pipeline e fechamento
- Monde deve ser tratado como fonte principal de receita

Essa regra precisa ficar explicita no backend e na documentacao.

## 5.5 Normalizacao de canais

O sistema deve padronizar os nomes dos canais para uma lista controlada, por exemplo:

- Meta Ads
- Google Ads
- Indicacao
- Prospeccao ativa
- Organico
- Parceiros
- VPM
- Outros

Sem isso, o painel perde consistencia.

## 5.6 Saidas esperadas do processamento

O upload deve produzir, no minimo:

- vendas por canal
- receita por canal
- ticket medio por canal
- total de canais ativos
- ranking por canal
- data da ultima importacao

## 6. Recomendacao tecnica para construir o MVP de forma simples e funcional

O caminho mais pragmatico e:

- manter Next.js
- manter API Routes
- manter upload manual
- manter sync manual da Meta
- persistir resumos consolidados

## 6.1 Banco de dados no MVP

Banco nao e obrigatorio no primeiro corte, mas e recomendado se o projeto vai evoluir rapido.

### Sem banco

Aceitavel apenas se:

- uso interno
- baixo volume
- atualizacao manual
- sem historico forte
- objetivo de validacao rapida

### Com banco

Mais adequado se:

- quer manter historico
- quer reprocessar dados
- quer rastrear imports
- quer evitar retrabalho estrutural
- quer evoluir para automacao depois

## 6.2 Recomendacao final para este projeto

Como ja existe base de rotas, paginas e ETL, o melhor MVP tecnico e:

- Next.js no frontend e backend
- Prisma com banco relacional simples
- tabela de configuracao Meta
- tabela de imports
- tabela de metricas consolidadas Meta
- tabela de vendas consolidadas por canal
- tabela de mapeamento de canais

## 6.3 Persistencia minima recomendada

Mesmo no MVP, persistir:

- token Meta criptografado
- ultima conta de ads selecionada
- status e data da ultima sincronizacao
- resumo de Meta por periodo
- resumo de vendas por canal
- historico basico de imports

## 6.4 O que evitar no MVP

- funil complexo demais
- atribuicao sofisticada
- excesso de graficos
- automacao por cron logo no inicio
- dezenas de tabelas sem uso
- cruzamentos de dados sem confiabilidade

## 7. Backlog objetivo do MVP

### Prioridade 1

- corrigir armazenamento seguro do token Meta
- exibir status real da conexao
- consolidar upload de planilhas com feedback de processamento
- trocar mocks da visao geral por dados persistidos

### Prioridade 2

- criar pagina Meta Ads com tabela por campanha e criativo
- criar pagina Marketing + Vendas com receita por canal
- implementar comparacao 7, 14 e 30 dias

### Prioridade 3

- adicionar resumo executivo automatico
- adicionar alertas estrategicos simples
- adicionar comparacao investimento x retorno quando possivel

## 8. Checklist de validacao desta especificacao

Esta especificacao contempla:

- visao geral de marketing e vendas
- investimento no Meta Ads
- leitura por campanhas, conjuntos, anuncios e criativos
- upload de planilhas
- analise de vendas fechadas por canal
- consolidacao de receita por canal
- panorama executivo do negocio
- simplicidade do MVP
