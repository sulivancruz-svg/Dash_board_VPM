import { buildIntelligencePrompt } from '@/lib/ai/intelligence-context';

const baseData = {
  channelRanking: [
    { canal: 'Google Ads', attribution: 'PAID_MEDIA', receita: 150000, deals: 10, ticketMedio: 15000, pctReceita: 60 },
    { canal: 'Indicação', attribution: 'ORGANIC_COMMERCIAL', receita: 80000, deals: 8, ticketMedio: 10000, pctReceita: 32 },
  ],
  monthly: [
    { monthKey: '2025-12', month: 'dez', year: 2025, receita: 80000, deals: 6 },
    { monthKey: '2026-01', month: 'jan', year: 2026, receita: 90000, deals: 7 },
    { monthKey: '2026-02', month: 'fev', year: 2026, receita: 100000, deals: 8 },
  ],
  kpis: {
    roas: 3.2,
    cpl: 1800,
    receita: 250000,
    deals: 18,
    ticketMedio: 13888,
  },
  googleProjection: { hasEnoughData: true, roiHistorico: 3.2, r2: 0.87 },
  anomalies: {
    totalAlerts: 1,
    alerts: [{ metric: 'Receita Mensal', severity: 'warning', message: 'Receita (fev/2026) está 22% abaixo da média histórica', zScore: -1.4 }],
  },
};

describe('buildIntelligencePrompt', () => {
  it('inclui os canais no prompt', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('Google Ads');
    expect(prompt).toContain('Indicação');
  });

  it('menciona ROAS e não ROI', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('ROAS');
    expect(prompt).not.toContain(' ROI ');
  });

  it('inclui histórico mensal', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('jan/2026');
    expect(prompt).toContain('fev/2026');
  });

  it('inclui alerta de anomalia quando presente', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).toContain('abaixo da média histórica');
  });

  it('não menciona SDR', () => {
    const prompt = buildIntelligencePrompt(baseData);
    expect(prompt).not.toContain('SDR');
  });
});
