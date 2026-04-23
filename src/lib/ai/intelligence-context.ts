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
    roasHistorico: number;
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
  lines.push(`- Faturamento total: ${BRL(data.kpis.receita)}`);
  lines.push(`- Deals fechados: ${NUM(data.kpis.deals)}`);
  lines.push(`- Ticket médio: ${BRL(data.kpis.ticketMedio)}`);
  if (data.kpis.roas !== null) lines.push(`- ROAS (mídia paga): ${data.kpis.roas}x`);
  if (data.kpis.cpl !== null) lines.push(`- CPL (custo por lead): ${BRL(data.kpis.cpl)}`);
  lines.push('');

  // Ranking de canais
  lines.push('## Canais de origem (por ticket médio)');
  for (const ch of data.channelRanking.slice(0, 10)) {
    lines.push(`- ${ch.canal}: faturamento ${BRL(ch.receita)}, ${ch.deals} deals, ticket médio ${BRL(ch.ticketMedio)}, ${ch.pctReceita}% do faturamento total`);
  }
  lines.push('');

  // Histórico mensal
  lines.push('## Histórico mensal (faturamento e deals)');
  for (const m of data.monthly) {
    lines.push(`- ${m.month}/${m.year}: ${BRL(m.receita)}, ${m.deals} deals`);
  }
  lines.push('');

  // Projeção Google
  if (data.googleProjection.hasEnoughData) {
    lines.push('## Projeção Google Ads');
    lines.push(`- ROAS histórico Google: ${data.googleProjection.roasHistorico}x`);
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
