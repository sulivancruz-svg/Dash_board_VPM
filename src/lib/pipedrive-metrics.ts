import type {
  ChannelSales,
  MonthlyRevenue,
  PipedriveDealRecord,
  PipedriveStore,
} from './data-store';
import type { DateRange } from './date-range';

/**
 * Normaliza nomes de canais confusos ou duplicados.
 * Resolve casos como "Espontaneamente + Indicação" → "Indicação"
 * Consolida variações do mesmo canal (ex: com/sem "um")
 */
function normalizeChannelName(rawCanal: string): string {
  if (!rawCanal) return '';

  const clean = rawCanal.trim();

  // Canais com múltiplas origem separadas por "+" — prioriza Indicação/Networking/Prospecção
  if (clean.includes('+')) {
    if (/indicação|indicado/i.test(clean)) {
      return 'Indicação - Indicado por um Cliente VPM';
    }
    if (/networking|relacionamento/i.test(clean)) {
      return 'Networking - Relacionamentos Pessoais';
    }
    if (/prospec[çc][aã]o/i.test(clean)) {
      return 'Prospecção Agente - Agente Provocou o Contato';
    }
  }

  // Consolida variações de Indicação (com/sem "um")
  if (/indicação.*cliente\s?vpm/i.test(clean)) {
    return 'Indicação - Indicado por um Cliente VPM';
  }

  // Sem origem definida → Não informado
  if (/criado\s+manualmente/i.test(clean)) {
    return 'Não informado';
  }

  return clean;
}

const MONTH_PT: Record<number, string> = {
  1: 'janeiro',
  2: 'fevereiro',
  3: 'marco',
  4: 'abril',
  5: 'maio',
  6: 'junho',
  7: 'julho',
  8: 'agosto',
  9: 'setembro',
  10: 'outubro',
  11: 'novembro',
  12: 'dezembro',
};

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface PipedriveMetrics {
  totalDeals: number;
  totalRevenue: number;
  totalTransacoes: number;
  ticketMedio: number;
  totalLeads: number;
  totalLost: number;
  totalWon: number;
  withMondeBilling: number;
  totalCohortConverted: number; // leads do período que viraram venda no Monde (qualquer data)
  avgDaysToWin: number | null;
  period: string | null;
  channels: ChannelSales[];
  monthly: MonthlyRevenue[];
  pipelineDeals: PipedriveDealRecord[];
  mondeDeals: PipedriveDealRecord[];
}

export function getPipedriveMetricsForRange(
  data: PipedriveStore | null,
  range?: DateRange,
): PipedriveMetrics | null {
  if (!data) {
    return null;
  }

  const pipelineDeals = Array.isArray(data.pipelineDeals) ? data.pipelineDeals : [];
  const mondeDeals = Array.isArray(data.mondeDeals) ? data.mondeDeals : [];

  if (pipelineDeals.length === 0 && mondeDeals.length === 0) {
    return {
      totalDeals: data.totalDeals || 0,
      totalRevenue: data.totalRevenue || 0,
      totalTransacoes: data.totalTransacoes || 0,
      ticketMedio: data.ticketMedio || 0,
      totalLeads: data.totalLeads || 0,
      totalLost: data.totalLost || 0,
      totalWon: data.totalWon || 0,
      withMondeBilling: data.withMondeBilling || data.totalDeals || 0,
      totalCohortConverted: 0,
      avgDaysToWin: null,
      period: data.period || null,
      channels: data.channels || [],
      monthly: data.monthly || [],
      pipelineDeals: [],
      mondeDeals: [],
    };
  }

  const filteredPipelineDeals = pipelineDeals.filter((deal) => isDealInRange(deal, range));
  const filteredMondeDeals = mondeDeals.filter((deal) => isDealInRange(deal, range));
  const leadSourceDeals = filteredPipelineDeals.length > 0
    ? filteredPipelineDeals
    : filteredMondeDeals.map((deal) => ({
      ...deal,
      receita: 0,
      hasMondeBilling: false,
    }));

  const channelMap = new Map<string, {
    canal: string;
    leads: number;
    vendas: number;
    receita: number;
  }>();
  const monthMap = new Map<string, {
    year: number;
    month: string;
    receita: number;
    deals: number;
  }>();

  let totalRevenue = 0;
  let totalLost = 0;
  let totalWon = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const deal of leadSourceDeals) {
    const normalizedCanal = normalizeChannelName(deal.canal);
    const entry = channelMap.get(normalizedCanal) ?? { canal: normalizedCanal, leads: 0, vendas: 0, receita: 0 };
    entry.leads += 1;
    channelMap.set(normalizedCanal, entry);

    if (isWonStatus(deal.status)) {
      totalWon += 1;
    } else if (isLostStatus(deal.status)) {
      totalLost += 1;
    }

    if (deal.createdDate) {
      if (!minDate || deal.createdDate < minDate) {
        minDate = deal.createdDate;
      }
      if (!maxDate || deal.createdDate > maxDate) {
        maxDate = deal.createdDate;
      }
    }
  }

  for (const deal of filteredMondeDeals) {
    const normalizedCanal = normalizeChannelName(deal.canal);
    const entry = channelMap.get(normalizedCanal) ?? { canal: normalizedCanal, leads: 0, vendas: 0, receita: 0 };
    entry.vendas += 1;
    entry.receita += deal.receita || 0;
    channelMap.set(normalizedCanal, entry);

    totalRevenue += deal.receita || 0;

    if (deal.createdDate) {
      if (!minDate || deal.createdDate < minDate) {
        minDate = deal.createdDate;
      }
      if (!maxDate || deal.createdDate > maxDate) {
        maxDate = deal.createdDate;
      }

      const year = Number.parseInt(deal.createdDate.slice(0, 4), 10);
      const monthNum = Number.parseInt(deal.createdDate.slice(5, 7), 10);
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthEntry = monthMap.get(monthKey) ?? {
        year,
        month: MONTH_PT[monthNum] ?? `mes-${monthNum}`,
        receita: 0,
        deals: 0,
      };
      monthEntry.receita += deal.receita || 0;
      monthEntry.deals += 1;
      monthMap.set(monthKey, monthEntry);
    }
  }

  if (filteredPipelineDeals.length === 0 && filteredMondeDeals.length > 0) {
    totalWon = filteredMondeDeals.length;
  }

  const channels = Array.from(channelMap.values())
    .map((entry) => ({
      canal: entry.canal,
      vendas: entry.vendas,
      receita: round2(entry.receita),
      ticket: entry.vendas > 0 ? round2(entry.receita / entry.vendas) : 0,
      leads: entry.leads,
    }))
    .sort((a, b) => {
      if (b.receita !== a.receita) {
        return b.receita - a.receita;
      }
      if ((b.vendas || 0) !== (a.vendas || 0)) {
        return (b.vendas || 0) - (a.vendas || 0);
      }
      return (b.leads || 0) - (a.leads || 0);
    });

  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, entry]) => ({
      year: entry.year,
      month: entry.month,
      monthKey,
      receita: round2(entry.receita),
      deals: entry.deals,
    }));

  const totalDeals = filteredMondeDeals.length;

  // Tempo médio de ganho: diferença entre data de venda (Monde) e data de criação no Pipe
  // Usa TODOS os pipelineDeals (sem filtro de data) para encontrar a data de entrada,
  // pois o deal pode ter sido criado no Pipe em um período anterior ao filtro selecionado.
  const allPipelineById = new Map(pipelineDeals.map((d) => [d.id, d]));
  const winDaysArr: number[] = [];
  for (const mondeDeal of filteredMondeDeals) {
    const pipeDeal = allPipelineById.get(mondeDeal.id);
    if (!pipeDeal?.createdDate || !mondeDeal.createdDate) continue;
    const days = Math.round(
      (new Date(`${mondeDeal.createdDate}T00:00:00`).getTime() - new Date(`${pipeDeal.createdDate}T00:00:00`).getTime())
      / (1000 * 60 * 60 * 24),
    );
    if (days >= 0) winDaysArr.push(days);
  }
  const avgDaysToWin = winDaysArr.length > 0
    ? Math.round(winDaysArr.reduce((sum, v) => sum + v, 0) / winDaysArr.length)
    : null;

  // Cohort: dos leads criados no período, quantos aparecem no Monde (qualquer data)
  // Usa todos os mondeDeals (sem filtro de período) para não perder vendas de meses posteriores
  const allMondeIds = new Set(mondeDeals.map((d) => d.id));
  const totalCohortConverted = filteredPipelineDeals.filter((d) => allMondeIds.has(d.id)).length;

  return {
    totalDeals,
    totalRevenue: round2(totalRevenue),
    totalTransacoes: totalDeals,
    ticketMedio: totalDeals > 0 ? round2(totalRevenue / totalDeals) : 0,
    totalLeads: leadSourceDeals.length,
    totalLost,
    totalWon,
    withMondeBilling: totalDeals,
    totalCohortConverted,
    avgDaysToWin,
    period: buildPeriodLabel(minDate, maxDate) || data.period || null,
    channels,
    monthly,
    pipelineDeals: filteredPipelineDeals,
    mondeDeals: filteredMondeDeals,
  };
}

function isDealInRange(deal: PipedriveDealRecord, range?: DateRange): boolean {
  if (!range) {
    return true;
  }

  if (!deal.createdDate) {
    return false;
  }

  return deal.createdDate >= range.start && deal.createdDate <= range.end;
}

function isWonStatus(status: string): boolean {
  return /ganho|won/.test(status);
}

function isLostStatus(status: string): boolean {
  return /perdido|lost/.test(status);
}

function buildPeriodLabel(minDate: string | null, maxDate: string | null): string | null {
  if (!minDate || !maxDate) {
    return null;
  }

  const min = new Date(`${minDate}T00:00:00`);
  const max = new Date(`${maxDate}T00:00:00`);
  if (Number.isNaN(min.getTime()) || Number.isNaN(max.getTime())) {
    return null;
  }

  return `${MONTH_ABBR[min.getMonth()]}/${min.getFullYear()} a ${MONTH_ABBR[max.getMonth()]}/${max.getFullYear()}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
