# Historical Uploads

## Objetivo

Permitir carregar arquivos de anos anteriores sem sobrescrever a base atual, mantendo historico por lote para comparacoes entre periodos.

## Estrutura recomendada

### `import_batches`

Uma linha por upload realizado.

Campos principais:
- `id`
- `source` (`sdr`, `pipedrive_monde`, `google_ads`, `meta_ads`)
- `reference_year`
- `period_start`
- `period_end`
- `batch_label`
- `file_name`
- `file_type`
- `uploaded_at`
- `uploaded_by`
- `status` (`draft`, `processed`, `failed`, `archived`)
- `notes`

### `pipe_pipeline_deals`

Topo do funil vindo do Pipe.

Campos principais:
- `batch_id`
- `deal_id`
- `created_date`
- `channel`
- `status`
- `customer_name`
- `raw_payload`

### `monde_deals`

Deals consolidados com faturamento.

Campos principais:
- `batch_id`
- `deal_id`
- `created_date`
- `channel`
- `status`
- `revenue_brl`
- `has_monde_billing`
- `raw_payload`

### `sdr_monthly`

Resumo mensal do SDR.

Campos principais:
- `batch_id`
- `reference_year`
- `month`
- `leads`
- `qualified`
- `sales`

### `google_ads_daily`

Granularidade diaria para comparacao por periodo.

Campos principais:
- `batch_id`
- `date`
- `campaign_id`
- `campaign_name`
- `channel_type`
- `channel_sub_type`
- `spend_brl`
- `impressions`
- `clicks`
- `conversions`

### `meta_ads_daily`

Granularidade diaria para midia paga da Meta.

Campos principais:
- `batch_id`
- `date`
- `campaign_id`
- `campaign_name`
- `adset_id`
- `adset_name`
- `ad_id`
- `ad_name`
- `spend_brl`
- `impressions`
- `reach`
- `clicks`
- `results`

## Regras de negocio

1. Cada upload gera um novo `batch_id`.
2. Upload historico nunca sobrescreve automaticamente a base atual.
3. Um lote pode ser marcado como `ativo para analise` sem apagar os demais.
4. Comparacoes do dashboard devem usar filtros por `periodo` e opcionalmente por `batch`.
5. Reprocessamento de um ano deve criar nova versao de lote, nao editar linhas antigas em silencio.

## Fluxo recomendado

1. Usuario escolhe a fonte.
2. Usuario informa ano de referencia, periodo e nome do lote.
3. Usuario envia o arquivo.
4. Sistema valida colunas obrigatorias.
5. Sistema grava um `import_batch`.
6. Sistema grava os dados normalizados na tabela correta.
7. Dashboard passa a permitir comparacoes entre periodo atual e lote historico.

## Fase 1

- Tela de uploads historicos
- Cadastro de metadados do lote
- Persistencia por lote
- Lista de lotes importados

## Fase 2

- Comparacao de periodos no dashboard
- Ativacao por lote
- Versionamento por fonte
- Auditoria de quem importou e quando
