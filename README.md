# Dashboard Corporativo

Dashboard de vendas em Next.js com integração ao Google Sheets, visualizações por vendedores, clientes, produtos, comportamento de compra, comparação de períodos e dados brutos.

## Requisitos

- Node.js 20+
- npm
- Planilha Google Sheets publicada/acessível via API

## Configuração

Crie um arquivo `.env` local com as variáveis necessárias:

```env
GOOGLE_SHEETS_CORPORATE_ID=
GOOGLE_SHEETS_CORPORATE_GID=
GOOGLE_SHEETS_CORPORATE_API_KEY=
DATABASE_URL=
```

## Desenvolvimento

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000/dashboard`.

## Produção local

```bash
npm run build
npm run start
```
