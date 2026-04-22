import type { OverviewData } from '@/lib/google-sheets';

interface InsightsData extends OverviewData {
  startDate: string;
  endDate: string;
  avgAdvanceDays: number;
  shortNotice: number;
  longAdvance: number;
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildInsightsPrompt(data: InsightsData): string {
  const topSellersText = data.topSellers
    .slice(0, 5)
    .map((s, i) => `${i + 1}. ${s.name}: R$ ${fmt(s.revenue)} (${s.sales} vendas)`)
    .join('\n');

  const topClientsText = data.topClients
    .slice(0, 5)
    .map((c, i) => `${i + 1}. ${c.name}: R$ ${fmt(c.revenue)} (${c.sales} compras)`)
    .join('\n');

  const topProductsText = data.topProducts
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.name}: R$ ${fmt(p.revenue)} (${p.sales} vendas)`)
    .join('\n');

  const trendText = data.salesTrend
    .slice(-12)
    .map((t) => `${t.date}: ${t.sales} vendas / R$ ${fmt(t.revenue)}`)
    .join('\n');

  return `Você é um analista estratégico de negócios. Analise os dados de vendas abaixo e gere insights em português brasileiro.

PERÍODO ANALISADO: ${data.startDate} a ${data.endDate}

VISÃO GERAL
- Total de vendas: ${data.totalSales}
- Faturamento total: R$ ${fmt(data.totalRevenue)}
- Ticket médio: R$ ${fmt(data.avgTicket)}
- Clientes únicos: ${data.totalClients}
- Produtos distintos vendidos: ${data.totalProducts}

TOP 5 VENDEDORES (por faturamento)
${topSellersText}

TOP 5 CLIENTES (por faturamento)
${topClientsText}

TOP 5 PRODUTOS (por faturamento)
${topProductsText}

TENDÊNCIA (últimos 12 períodos)
${trendText}

COMPORTAMENTO DE COMPRA
- Antecedência média: ${data.avgAdvanceDays} dias
- Vendas de última hora (0-7 dias): ${data.shortNotice}
- Vendas com 30+ dias de antecedência: ${data.longAdvance}

---

Gere uma análise estratégica estruturada EXATAMENTE nestas 3 seções:

## 🔍 DIAGNÓSTICO
Explique o que está acontecendo: tendências de faturamento, concentração de vendas por vendedor/cliente/produto, sazonalidade visível na tendência, e qualquer padrão relevante nos dados.

## ⚠️ ALERTAS
Liste de 3 a 5 pontos de atenção concretos. Cada alerta deve citar números específicos dos dados fornecidos.

## 🎯 RECOMENDAÇÕES ESTRATÉGICAS
Liste exatamente 5 ações priorizadas. Para cada uma: qual a ação, por que (baseada nos dados), e qual o impacto esperado.

Seja direto, objetivo e use sempre os números fornecidos para embasar cada ponto. Responda em português brasileiro.`;
}
