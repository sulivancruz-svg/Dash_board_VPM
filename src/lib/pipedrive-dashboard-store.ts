import type { PipedriveDealRecord, PipedriveStore } from './data-store';
import { getPipedriveMetricsForRange } from './pipedrive-metrics';
import type { PipedriveDirectData } from './pipedrive-direct-store';

interface BuildPipedriveDashboardStoreInput {
  mondeDeals: PipedriveDealRecord[];
  pipelineDeals?: PipedriveDealRecord[];
  directData?: PipedriveDirectData | null;
  updatedAt?: string;
  fallbackPeriod?: string | null;
}

function getDateOnly(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function mapPipedriveDirectDealsToPipelineDeals(
  directData: PipedriveDirectData | null | undefined,
): PipedriveDealRecord[] {
  if (!directData?.allDeals?.length) {
    return [];
  }

  return directData.allDeals
    .filter((deal) => !/pré\s*vendas.*livia/i.test(deal.pipelineName || ''))
    .map((deal) => ({
      id: String(deal.id),
      createdDate: getDateOnly(deal.addTime),
      canal: deal.canal || deal.howArrived || 'Nao Informado',
      status: String(deal.status || '').toLowerCase(),
      receita: 0,
      hasMondeBilling: false,
    }));
}

export function buildPipedriveDashboardStore(
  input: BuildPipedriveDashboardStoreInput,
): PipedriveStore {
  const updatedAt = input.updatedAt || new Date().toISOString();
  const directPipelineDeals = mapPipedriveDirectDealsToPipelineDeals(input.directData);
  const pipelineDeals = directPipelineDeals.length > 0
    ? directPipelineDeals
    : Array.isArray(input.pipelineDeals) ? input.pipelineDeals : [];

  // Cruzamento: enriquece canal dos mondeDeals com info do pipeline (Pipedrive direto) por Deal ID
  const pipelineById = new Map(pipelineDeals.map((d) => [d.id, d]));
  const mondeDeals = input.mondeDeals.map((deal) => {
    if (deal.canal && deal.canal !== 'Nao Informado') return deal;
    const pipeDeal = pipelineById.get(deal.id);
    if (!pipeDeal || !pipeDeal.canal || pipeDeal.canal === 'Nao Informado') return deal;
    return { ...deal, canal: pipeDeal.canal, status: deal.status || pipeDeal.status };
  });

  const seed: PipedriveStore = {
    updatedAt,
    totalDeals: mondeDeals.length,
    totalRevenue: mondeDeals.reduce((sum, deal) => sum + (deal.receita || 0), 0),
    totalTransacoes: mondeDeals.length,
    ticketMedio: 0,
    totalLeads: pipelineDeals.length,
    totalLost: 0,
    totalWon: 0,
    withMondeBilling: mondeDeals.length,
    period: input.fallbackPeriod || null,
    channels: [],
    monthly: [],
    pipelineDeals,
    mondeDeals,
  };

  const metrics = getPipedriveMetricsForRange(seed);
  if (!metrics) {
    return seed;
  }

  return {
    updatedAt,
    totalDeals: metrics.totalDeals,
    totalRevenue: metrics.totalRevenue,
    totalTransacoes: metrics.totalTransacoes,
    ticketMedio: metrics.ticketMedio,
    totalLeads: metrics.totalLeads,
    totalLost: metrics.totalLost,
    totalWon: metrics.totalWon,
    withMondeBilling: metrics.withMondeBilling,
    period: metrics.period || input.fallbackPeriod || null,
    channels: metrics.channels,
    monthly: metrics.monthly,
    pipelineDeals: metrics.pipelineDeals,
    mondeDeals: metrics.mondeDeals,
  };
}
