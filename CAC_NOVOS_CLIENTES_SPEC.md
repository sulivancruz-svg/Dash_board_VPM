# CAC Real de Novos Clientes

Objetivo: criar uma planilha separada para medir CAC real de novos clientes, sem misturar recompra, base ativa ou retorno de clientes antigos.

## Regra de negocio

Uma linha da planilha deve representar 1 venda convertida no Monde.

Essa venda so entra no CAC de novos clientes quando a pessoa compradora for identificada como cliente novo.

O ideal e nao inferir isso apenas pelo canal. O status de cliente novo deve vir de um identificador estavel do cliente e de uma regra clara de primeira compra.

## Por que a planilha atual nao basta

- `PIPE` mostra oportunidades, inclusive perdidas, abertas e ganhas.
- `RESULTADO` mostra o cruzamento entre `PIPE` e `MONDE` por `Negocio - ID`.
- Esse cruzamento informa que houve venda, mas nao informa com seguranca se a pessoa era cliente novo ou cliente da base.
- Canal de entrada ajuda como proxy, mas nao resolve o problema de forma confiavel.

## Estrutura recomendada

Formato: 1 linha por venda consolidada no Monde.

Colunas obrigatorias:

- `conversion_date`
  - Data em que a venda foi consolidada no Monde.
  - Formato recomendado: `YYYY-MM-DD`

- `deal_id_pipe`
  - ID do negocio no Pipe.
  - Permite reconciliar com a oportunidade original.

- `customer_key`
  - Identificador estavel do cliente.
  - Pode ser CPF, email normalizado, telefone normalizado, ou ID interno de cliente.
  - Esse campo e o mais importante para CAC real.

- `customer_name`
  - Nome do cliente.
  - Ajuda em auditoria, mas nao deve ser a chave principal.

- `acquisition_channel`
  - Canal de entrada original da oportunidade.
  - Ex.: `Google`, `Redes Sociais - Facebook ou Instagram`, `Indicacao`.

- `sale_value_brl`
  - Valor consolidado da venda no Monde.
  - Numero decimal em BRL.

- `customer_status`
  - Valores aceitos: `NEW`, `EXISTING`, `UNKNOWN`
  - `NEW`: cliente novo
  - `EXISTING`: cliente ja era cliente antes dessa venda
  - `UNKNOWN`: sem classificacao confiavel

Colunas recomendadas:

- `first_sale_date`
  - Data da primeira compra conhecida daquele `customer_key`.
  - Facilita auditoria e reprocessamento.

- `is_first_sale`
  - Valores aceitos: `TRUE`, `FALSE`
  - Deve ser `TRUE` quando esta linha for a primeira venda daquele cliente.

- `source_system`
  - Origem do dado.
  - Ex.: `MONDE`, `CRM`, `ERP`

- `notes`
  - Campo livre para observacao operacional.

## Regra de classificacao recomendada

Regra principal:

- Se `customer_status = NEW`, a venda entra no CAC real de novos clientes.
- Se `customer_status = EXISTING`, a venda nao entra.
- Se `customer_status = UNKNOWN`, a venda fica fora por padrao ou entra em uma visao separada de pendencias.

Regra alternativa, quando houver historico confiavel por `customer_key`:

- Ordenar vendas por `conversion_date` dentro do mesmo `customer_key`
- A primeira venda recebe `is_first_sale = TRUE`
- As demais recebem `FALSE`

## Formula do indicador

`CAC real de novos clientes = investimento do periodo / quantidade de vendas NEW no periodo`

Observacoes:

- O numerador pode continuar sendo `Meta + Google`, se essa for a regra financeira atual.
- O denominador passa a ser apenas clientes novos convertidos.
- Recompra, retorno e base ativa ficam fora.

## Regras de validacao para a futura importacao

- Rejeitar linhas sem `conversion_date`
- Rejeitar linhas sem `deal_id_pipe`
- Rejeitar linhas sem `customer_key`
- Rejeitar linhas sem `sale_value_brl`
- Rejeitar `customer_status` fora de `NEW`, `EXISTING`, `UNKNOWN`
- Alertar quando o mesmo `deal_id_pipe` aparecer mais de uma vez
- Alertar quando o mesmo `customer_key` tiver duas linhas marcadas como `is_first_sale = TRUE`

## O que fazer com canal de entrada

Canal deve ser usado como dimensao analitica, nao como definicao primaria de cliente novo.

Uso correto:

- quebrar CAC real por canal
- comparar novos clientes por Google, Meta, Site, Indicacao
- analisar mix de aquisicao

Uso incorreto:

- assumir que todo `Google` ou `Facebook/Instagram` e cliente novo
- assumir que todo `Espontaneamente` e cliente antigo

## Template sugerido

Arquivo de exemplo:

- `templates/cac-novos-clientes-template.csv`

## Caminho de implementacao depois

1. Subir essa planilha em uma nova secao de configuracao
2. Criar parser proprio
3. Persistir um store separado para `new-customer-cac`
4. Exibir uma nova aba com:
   - CAC real de novos clientes
   - quantidade de novos clientes
   - receita de novos clientes
   - corte por canal
   - pendencias `UNKNOWN`
