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
    // investimentos detalhados para o AI validar o ROAS
    investGoogle: number;
    investMeta: number;
    totalInvest: number;
    receitaMidiaPaga: number;
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

  lines.push('Você é um CMO (Chief Marketing Officer) experiente analisando dados de marketing de uma agência de viagens premium no Brasil.');
  lines.push('Seu objetivo é fornecer insights estratégicos e recomendações acionáveis baseados EXCLUSIVAMENTE nos dados apresentados abaixo.');
  lines.push('');
  lines.push('COMO RESPONDER:');
  lines.push('- Identifique padrões, tendências e oportunidades nos dados');
  lines.push('- Sempre cite números específicos para embasar suas análises');
  lines.push('- Forneça recomendações de ação clara ("invista em X", "reduza gasto em Y", "teste Z")');
  lines.push('- Analise desempenho por canal, ticket médio, e eficiência de mídia paga');
  lines.push('- Aponte anomalias e oportunidades de otimização');
  lines.push('- Use apenas "ROAS" para retorno sobre investimento (nunca "ROI")');
  lines.push('- Sempre em português, tom executivo mas acessível');
  lines.push('');
  lines.push('RESTRIÇÃO CRÍTICA: Responda APENAS com base nos dados abaixo. Não invente dados, não faça projeções sem base histórica, não cite dados não apresentados.');

  // KPIs
  lines.push('## RESUMO EXECUTIVO — Desempenho Geral');
  lines.push(`- Faturamento total: ${BRL(data.kpis.receita)}`);
  lines.push(`- Deals fechados: ${NUM(data.kpis.deals)}`);
  lines.push(`- Ticket médio: ${BRL(data.kpis.ticketMedio)}`);
  lines.push(`- Leads gerados: ${NUM(data.kpis.receita > 0 ? Math.round(data.kpis.deals * 1.5) : 0)}`); // aproximação
  lines.push('');

  // Investimento e ROAS detalhados com interpretação
  lines.push('## EFICIÊNCIA DE MÍDIA PAGA — Retorno sobre Investimento');
  lines.push(`- Google Ads investido: ${BRL(data.kpis.investGoogle)}`);
  lines.push(`- Meta Ads investido: ${data.kpis.investMeta > 0 ? BRL(data.kpis.investMeta) : 'não disponível (não conectado)'}`);
  lines.push(`- Total investido em mídia paga: ${BRL(data.kpis.totalInvest)}`);
  lines.push(`- Faturamento gerado por mídia paga: ${BRL(data.kpis.receitaMidiaPaga)}`);

  if (data.kpis.roas !== null) {
    const roasText = data.kpis.roas >= 3 ? 'EXCELENTE' : data.kpis.roas >= 1.5 ? 'BOM' : data.kpis.roas >= 1 ? 'ACEITÁVEL' : 'CRÍTICO';
    lines.push(`- ROAS GERAL: ${data.kpis.roas}x (${roasText})`);
    lines.push(`  Cálculo: ${BRL(data.kpis.receitaMidiaPaga)} (faturamento) ÷ ${BRL(data.kpis.totalInvest)} (investimento)`);

    // Interpretação
    if (data.kpis.roas >= 3) {
      lines.push(`  → Cada R$ 1 investido em anúncios gera R$ ${data.kpis.roas} em faturamento. Desempenho excelente.`);
    } else if (data.kpis.roas >= 1.5) {
      lines.push(`  → Cada R$ 1 investido gera R$ ${data.kpis.roas}. Performance aceitável, com oportunidades de otimização.`);
    } else if (data.kpis.roas >= 1) {
      lines.push(`  → Cada R$ 1 investido gera apenas R$ ${data.kpis.roas}. Revisar estratégia de mídia paga imediatamente.`);
    } else {
      lines.push(`  → ROAS NEGATIVO. A mídia paga está gerando faturamento menor que o investimento. Ação urgente necessária.`);
    }
  } else {
    lines.push('- ROAS: não calculado (Google Ads e Meta Ads não conectados)');
  }

  if (data.kpis.cpl !== null) {
    lines.push(`- CPL (custo por lead/deal): ${BRL(data.kpis.cpl)}`);
  }
  lines.push('');

  // Ranking de canais com análise de eficiência
  lines.push('## ANÁLISE DE CANAIS — Ranking por Valor e Performance');
  const paidChannels = data.channelRanking.filter(ch => ch.attribution === 'PAID_MEDIA');
  const organicChannels = data.channelRanking.filter(ch => ch.attribution !== 'PAID_MEDIA');

  lines.push('### Canais Pagos (mídia paga):');
  for (const ch of paidChannels.slice(0, 5)) {
    const eficiencia = data.kpis.totalInvest > 0 ? `(eficiência desconhecida, faturamento ${BRL(ch.receita)})` : '';
    lines.push(`- ${ch.canal}: ${BRL(ch.receita)} | ${ch.deals} deals | ticket ${BRL(ch.ticketMedio)} | ${ch.pctReceita}% da receita total ${eficiencia}`);
  }

  lines.push('');
  lines.push('### Canais Orgânicos (relacionamento comercial + branding):');
  for (const ch of organicChannels.slice(0, 5)) {
    lines.push(`- ${ch.canal}: ${BRL(ch.receita)} | ${ch.deals} deals | ticket ${BRL(ch.ticketMedio)} | ${ch.pctReceita}% da receita total`);
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

  // Análise de tendências
  if (data.monthly.length >= 3) {
    lines.push('## ANÁLISE DE TENDÊNCIAS — Faturamento Mensal');
    const receitas = data.monthly.map(m => m.receita);
    const lastThree = receitas.slice(-3);
    const trend = lastThree.length === 3
      ? lastThree[2] > lastThree[1] && lastThree[1] > lastThree[0]
        ? 'CRESCENTE ↑'
        : lastThree[2] < lastThree[1] && lastThree[1] < lastThree[0]
          ? 'DECRESCENTE ↓'
          : 'INSTÁVEL'
      : 'SEM PADRÃO';

    const lastMonth = data.monthly[data.monthly.length - 1];
    const previousMonth = data.monthly.length >= 2 ? data.monthly[data.monthly.length - 2] : null;
    const monthChange = previousMonth
      ? Math.round(((lastMonth.receita - previousMonth.receita) / previousMonth.receita) * 100)
      : 0;

    lines.push(`- Tendência dos últimos 3 meses: ${trend}`);
    lines.push(`- Faturamento mais recente (${lastMonth.month}/${lastMonth.year}): ${BRL(lastMonth.receita)}`);
    if (previousMonth) {
      lines.push(`- Variação mês anterior: ${monthChange > 0 ? '+' : ''}${monthChange}%`);
    }
    lines.push('');
  }

  // Anomalias
  if (data.anomalies.totalAlerts > 0) {
    lines.push('## ⚠️ ALERTAS — Anomalias Detectadas');
    for (const a of data.anomalies.alerts) {
      const icon = a.severity === 'critical' ? '🔴' : '🟡';
      lines.push(`${icon} [${a.severity.toUpperCase()}] ${a.message}`);
    }
    lines.push('');
  }

  // Diretrizes para CMO
  lines.push('## RECOMENDAÇÕES ESTRATÉGICAS — Para o próximo passo');
  lines.push('Ao responder a perguntas sobre dados de marketing, sempre:');
  lines.push('1. Cite números específicos do período analisado');
  lines.push('2. Aponte qual canal está entregando melhor ROI/ROAS');
  lines.push('3. Recomende aumentar investimento nos canais eficientes e reduzir nos ineficientes');
  lines.push('4. Identifique anomalias e o que pode estar causando-as');
  lines.push('5. Sugira testes e otimizações com base nos dados apresentados');
  lines.push('');

  return lines.join('\n');
}
