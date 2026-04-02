import type {
  PipedriveDirectChannelRow,
  PipedriveDirectData,
  PipedriveDirectMonthRow,
  PipedriveDirectRecentDeal,
} from '@/lib/pipedrive-direct-store';

interface PipedriveField {
  key: string;
  name: string;
  field_type?: string;
  options?: Array<{
    id: string | number;
    label: string;
  }>;
}

interface PipedriveDeal {
  id: number;
  title?: string;
  status?: string;
  currency?: string | null;
  add_time?: string | null;
  won_time?: string | null;
  owner_id?: number | null;
  stage_id?: number | null;
  pipeline_id?: number | null;
  lost_reason?: string | null;
  custom_fields?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PipedriveUser {
  id: number;
  name: string;
}

interface PipedrivePipeline {
  id: number;
  name: string;
}

interface PipedriveStage {
  id: number;
  name: string;
  pipeline_id?: number | null;
}

interface PipedriveApiResponse<T> {
  success?: boolean;
  data?: T;
  additional_data?: {
    next_cursor?: string | null;
    pagination?: {
      next_cursor?: string | null;
      more_items_in_collection?: boolean;
    };
  };
}

export interface PipedriveDirectPeriodSummary {
  updatedAt: string;
  companyName: string;
  companyDomain: string;
  period: {
    start: string;
    end: string;
  };
  fields: {
    channelFieldName: string | null;
    howArrivedFieldName: string | null;
  };
  summary: {
    opportunities: number;
    won: number;
    lost: number;
    open: number;
    winRate: number;
    avgDaysToWin: number | null;
  };
  channels: Array<{ label: string; deals: number; wonDeals: number; winRate: number }>;
  owners: Array<{ label: string; deals: number; wonDeals: number; openDeals: number; winRate: number }>;
  pipelines: Array<{ label: string; deals: number; wonDeals: number; lostDeals: number; openDeals: number; winRate: number }>;
  openStages: Array<{ label: string; pipelineLabel: string; count: number }>;
  lostStages: Array<{ label: string; pipelineLabel: string; count: number }>;
  leadFunnel: Array<{ label: string; pipelineLabel: string; deals: number; openDeals: number; wonDeals: number; lostDeals: number }>;
  lostReasons: Array<{ label: string; count: number }>;
  monthly: Array<{ monthKey: string; label: string; deals: number; wonDeals: number; lostDeals: number; openDeals: number }>;
  weekly: Array<{ weekKey: string; label: string; deals: number }>;
  recentDeals: PipedriveDirectRecentDeal[];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isLeadPipeline(pipelineLabel: string): boolean {
  const normalized = normalizeText(pipelineLabel);
  return normalized.includes('pre') || normalized.includes('lead');
}

function getBaseUrl(companyDomain: string): string {
  return `https://${companyDomain}.pipedrive.com`;
}

async function fetchPipedrive<T>(
  companyDomain: string,
  apiToken: string,
  endpoint: string,
  searchParams?: Record<string, string>,
): Promise<PipedriveApiResponse<T>> {
  const url = new URL(`${getBaseUrl(companyDomain)}${endpoint}`);
  url.searchParams.set('api_token', apiToken);

  for (const [key, value] of Object.entries(searchParams || {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Pipedrive request failed: ${response.status}`);
  }

  return response.json() as Promise<PipedriveApiResponse<T>>;
}

export async function validatePipedriveConnection(companyDomain: string, apiToken: string) {
  const [dealsResponse, fieldsResponse] = await Promise.all([
    fetchPipedrive<PipedriveDeal[]>(companyDomain, apiToken, '/api/v2/deals', { limit: '1' }),
    fetchPipedrive<PipedriveField[]>(companyDomain, apiToken, '/api/v1/dealFields', { limit: '500' }),
  ]);

  return {
    totalDealsPreview: Array.isArray(dealsResponse.data) ? dealsResponse.data.length : 0,
    fields: Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [],
  };
}

function getDateOnly(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function getMonthKey(dateValue: string | null | undefined): string | null {
  const dateOnly = getDateOnly(dateValue);
  return dateOnly ? dateOnly.slice(0, 7) : null;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthLabels[Number.parseInt(month, 10) - 1] || month}/${year}`;
}

function getWeekStart(dateOnly: string): Date {
  const date = new Date(`${dateOnly}T00:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${weekStart.toLocaleDateString('pt-BR', options)} - ${weekEnd.toLocaleDateString('pt-BR', options)}`;
}

function diffDays(start: string | null | undefined, end: string | null | undefined): number | null {
  const startDate = getDateOnly(start);
  const endDate = getDateOnly(end);
  if (!startDate || !endDate) {
    return null;
  }

  const startValue = new Date(`${startDate}T00:00:00`).getTime();
  const endValue = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(startValue) || Number.isNaN(endValue) || endValue < startValue) {
    return null;
  }

  return Math.round((endValue - startValue) / (24 * 60 * 60 * 1000));
}

function normalizeFieldRawValue(rawValue: unknown): string | null {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  if (Array.isArray(rawValue)) {
    const values = rawValue
      .map((item) => String(item).trim())
      .filter(Boolean);
    return values.length > 0 ? values.join(',') : null;
  }

  return String(rawValue).trim() || null;
}

function mapOptionLabels(field: PipedriveField, rawValue: unknown): string | null {
  if (!field.options || field.options.length === 0) {
    return null;
  }

  const labelsById = new Map(field.options.map((option) => [String(option.id), option.label]));
  const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue];
  const labels = rawValues
    .map((value) => labelsById.get(String(value)))
    .filter((value): value is string => Boolean(value));

  return labels.length > 0 ? labels.join(' + ') : null;
}

function getMappedFieldValue(deal: PipedriveDeal, field: PipedriveField | null): string | null {
  if (!field?.key) {
    return null;
  }

  const rawValue = deal[field.key] ?? deal.custom_fields?.[field.key];
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const mappedLabel = mapOptionLabels(field, rawValue);
  if (mappedLabel) {
    return mappedLabel;
  }

  return normalizeFieldRawValue(rawValue);
}

function findFieldByName(fields: PipedriveField[], candidates: string[]): PipedriveField | null {
  const normalizedCandidates = candidates.map(normalizeText);
  return fields.find((field) => normalizedCandidates.includes(normalizeText(field.name))) || null;
}

async function fetchAllDeals(companyDomain: string, apiToken: string, customFieldKeys: string[]) {
  const deals: PipedriveDeal[] = [];
  let cursor: string | null = null;

  do {
    const response: PipedriveApiResponse<PipedriveDeal[]> = await fetchPipedrive<PipedriveDeal[]>(
      companyDomain,
      apiToken,
      '/api/v2/deals',
      {
        limit: '500',
        ...(cursor ? { cursor } : {}),
        ...(customFieldKeys.length > 0 ? { custom_fields: customFieldKeys.join(',') } : {}),
      },
    );

    deals.push(...(response.data || []));
    cursor = response.additional_data?.next_cursor || response.additional_data?.pagination?.next_cursor || null;
  } while (cursor);

  return deals;
}

async function fetchUsersMap(companyDomain: string, apiToken: string): Promise<Map<number, string>> {
  const response = await fetchPipedrive<PipedriveUser[]>(companyDomain, apiToken, '/api/v1/users', { limit: '500' });
  const users = Array.isArray(response.data) ? response.data : [];
  return new Map(users.map((user) => [user.id, user.name]));
}

async function fetchPipelinesMap(companyDomain: string, apiToken: string): Promise<Map<number, string>> {
  const response = await fetchPipedrive<PipedrivePipeline[]>(companyDomain, apiToken, '/api/v1/pipelines');
  const pipelines = Array.isArray(response.data) ? response.data : [];
  return new Map(pipelines.map((pipeline) => [pipeline.id, pipeline.name]));
}

async function fetchStagesMap(companyDomain: string, apiToken: string): Promise<Map<number, { name: string; pipelineId: number | null }>> {
  const response = await fetchPipedrive<PipedriveStage[]>(companyDomain, apiToken, '/api/v1/stages');
  const stages = Array.isArray(response.data) ? response.data : [];
  return new Map(
    stages.map((stage) => [
      stage.id,
      {
        name: stage.name,
        pipelineId: typeof stage.pipeline_id === 'number' ? stage.pipeline_id : null,
      },
    ]),
  );
}

export async function syncPipedriveDirectData(input: {
  companyName: string;
  companyDomain: string;
  apiToken: string;
}): Promise<PipedriveDirectData> {
  const [fieldsResponse, usersMap, pipelinesMap, stagesMap] = await Promise.all([
    fetchPipedrive<PipedriveField[]>(input.companyDomain, input.apiToken, '/api/v1/dealFields', { limit: '500' }),
    fetchUsersMap(input.companyDomain, input.apiToken),
    fetchPipelinesMap(input.companyDomain, input.apiToken),
    fetchStagesMap(input.companyDomain, input.apiToken),
  ]);

  const fields = Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [];
  const channelField = findFieldByName(fields, ['Canal de entrada', 'Canal Entrada', 'Channel']);
  const howArrivedField = findFieldByName(fields, ['Como chegou', 'Como Chegou', 'Origem']);
  const deals = await fetchAllDeals(
    input.companyDomain,
    input.apiToken,
    [channelField?.key, howArrivedField?.key].filter((value): value is string => Boolean(value)),
  );

  const recentDeals = deals
    .map<PipedriveDirectRecentDeal>((deal) => {
      const howArrived = getMappedFieldValue(deal, howArrivedField || null);
      const canal = getMappedFieldValue(deal, channelField || null) || howArrived || 'Nao Informado';
      const ownerId = typeof deal.owner_id === 'number' ? deal.owner_id : null;
      const pipelineId = typeof deal.pipeline_id === 'number' ? deal.pipeline_id : null;
      const stageId = typeof deal.stage_id === 'number' ? deal.stage_id : null;
      const stageMeta = stageId ? stagesMap.get(stageId) || null : null;
      const resolvedPipelineId = pipelineId || stageMeta?.pipelineId || null;

      return {
        id: deal.id,
        title: deal.title || `Deal ${deal.id}`,
        status: String(deal.status || 'unknown'),
        ownerId,
        currency: typeof deal.currency === 'string' ? deal.currency : null,
        addTime: deal.add_time || null,
        wonTime: deal.won_time || null,
        ownerName: ownerId ? usersMap.get(ownerId) || null : null,
        canal,
        howArrived,
        lostReason: typeof deal.lost_reason === 'string' && deal.lost_reason.trim() ? deal.lost_reason.trim() : null,
        stageId,
        pipelineId: resolvedPipelineId,
        stageName: stageMeta?.name || null,
        pipelineName: resolvedPipelineId ? pipelinesMap.get(resolvedPipelineId) || null : null,
      };
    })
    .sort((a, b) => String(b.addTime || '').localeCompare(String(a.addTime || '')));

  const channelsMap = new Map<string, PipedriveDirectChannelRow>();
  const monthsMap = new Map<string, PipedriveDirectMonthRow>();
  let totalOpen = 0;
  let totalWon = 0;
  let totalLost = 0;

  for (const deal of recentDeals) {
    const status = deal.status.toLowerCase();
    if (status === 'won') {
      totalWon += 1;
    } else if (status === 'lost') {
      totalLost += 1;
    } else {
      totalOpen += 1;
    }

    const channelEntry = channelsMap.get(deal.canal) || {
      canal: deal.canal,
      deals: 0,
      wonDeals: 0,
    };
    channelEntry.deals += 1;
    if (status === 'won') {
      channelEntry.wonDeals += 1;
    }
    channelsMap.set(deal.canal, channelEntry);

    const monthKey = getMonthKey(deal.addTime);
    if (monthKey) {
      const monthEntry = monthsMap.get(monthKey) || {
        monthKey,
        label: formatMonthLabel(monthKey),
        deals: 0,
        wonDeals: 0,
      };
      monthEntry.deals += 1;
      if (status === 'won') {
        monthEntry.wonDeals += 1;
      }
      monthsMap.set(monthKey, monthEntry);
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    companyName: input.companyName,
    companyDomain: input.companyDomain,
    totalDeals: recentDeals.length,
    totalOpen,
    totalWon,
    totalLost,
    fields: {
      channelFieldName: channelField?.name || null,
      howArrivedFieldName: howArrivedField?.name || null,
    },
    channels: Array.from(channelsMap.values()).sort((a, b) => b.deals - a.deals).slice(0, 12),
    monthly: Array.from(monthsMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey)).slice(-12),
    recentDeals: recentDeals.slice(0, 20),
    allDeals: recentDeals,
  };
}

function isInRange(dateValue: string | null | undefined, start: string, end: string): boolean {
  const dateOnly = getDateOnly(dateValue);
  if (!dateOnly) {
    return false;
  }

  return dateOnly >= start && dateOnly <= end;
}

export function buildPipedriveDirectPeriodSummary(
  source: PipedriveDirectData,
  start: string,
  end: string,
): PipedriveDirectPeriodSummary {
  const deals = source.allDeals.filter((deal) => isInRange(deal.addTime, start, end));
  const channelsMap = new Map<string, { label: string; deals: number; wonDeals: number }>();
  const ownersMap = new Map<string, { label: string; deals: number; wonDeals: number; openDeals: number }>();
  const pipelinesMap = new Map<string, { label: string; deals: number; wonDeals: number; lostDeals: number; openDeals: number }>();
  const openStagesMap = new Map<string, { label: string; pipelineLabel: string; count: number }>();
  const lostStagesMap = new Map<string, { label: string; pipelineLabel: string; count: number }>();
  const leadFunnelMap = new Map<string, { label: string; pipelineLabel: string; deals: number; openDeals: number; wonDeals: number; lostDeals: number }>();
  const lostReasonsMap = new Map<string, number>();
  const monthlyMap = new Map<string, { monthKey: string; label: string; deals: number; wonDeals: number; lostDeals: number; openDeals: number }>();
  const weeklyMap = new Map<string, { weekKey: string; label: string; deals: number }>();

  let won = 0;
  let lost = 0;
  let open = 0;
  const winDays: number[] = [];

  for (const deal of deals) {
    const status = deal.status.toLowerCase();
    const channelLabel = deal.canal || 'Nao Informado';
    const ownerLabel = deal.ownerName || 'Sem responsavel';
    const pipelineLabel = deal.pipelineName || 'Sem funil';
    const stageLabel = deal.stageName || 'Sem etapa';
    const monthKey = getMonthKey(deal.addTime);
    const dateOnly = getDateOnly(deal.addTime);

    if (status === 'won') {
      won += 1;
      const days = diffDays(deal.addTime, deal.wonTime);
      if (days !== null) {
        winDays.push(days);
      }
    } else if (status === 'lost') {
      lost += 1;
      if (deal.lostReason) {
        lostReasonsMap.set(deal.lostReason, (lostReasonsMap.get(deal.lostReason) || 0) + 1);
      }
    } else {
      open += 1;
    }

    const channelEntry = channelsMap.get(channelLabel) || { label: channelLabel, deals: 0, wonDeals: 0 };
    channelEntry.deals += 1;
    if (status === 'won') {
      channelEntry.wonDeals += 1;
    }
    channelsMap.set(channelLabel, channelEntry);

    const ownerEntry = ownersMap.get(ownerLabel) || { label: ownerLabel, deals: 0, wonDeals: 0, openDeals: 0 };
    ownerEntry.deals += 1;
    if (status === 'won') {
      ownerEntry.wonDeals += 1;
    }
    if (status !== 'won' && status !== 'lost') {
      ownerEntry.openDeals += 1;
    }
    ownersMap.set(ownerLabel, ownerEntry);

    const pipelineEntry = pipelinesMap.get(pipelineLabel) || {
      label: pipelineLabel,
      deals: 0,
      wonDeals: 0,
      lostDeals: 0,
      openDeals: 0,
    };
    pipelineEntry.deals += 1;
    if (status === 'won') {
      pipelineEntry.wonDeals += 1;
    } else if (status === 'lost') {
      pipelineEntry.lostDeals += 1;
    } else {
      pipelineEntry.openDeals += 1;
    }
    pipelinesMap.set(pipelineLabel, pipelineEntry);

    if (isLeadPipeline(pipelineLabel)) {
      const leadFunnelKey = `${pipelineLabel}::${stageLabel}`;
      const leadFunnelEntry = leadFunnelMap.get(leadFunnelKey) || {
        label: stageLabel,
        pipelineLabel,
        deals: 0,
        openDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
      };
      leadFunnelEntry.deals += 1;
      if (status === 'won') {
        leadFunnelEntry.wonDeals += 1;
      } else if (status === 'lost') {
        leadFunnelEntry.lostDeals += 1;
      } else {
        leadFunnelEntry.openDeals += 1;
      }
      leadFunnelMap.set(leadFunnelKey, leadFunnelEntry);
    }

    if (status === 'lost') {
      const lostStageKey = `${pipelineLabel}::${stageLabel}`;
      const lostStageEntry = lostStagesMap.get(lostStageKey) || {
        label: stageLabel,
        pipelineLabel,
        count: 0,
      };
      lostStageEntry.count += 1;
      lostStagesMap.set(lostStageKey, lostStageEntry);
    } else if (status !== 'won') {
      const openStageKey = `${pipelineLabel}::${stageLabel}`;
      const openStageEntry = openStagesMap.get(openStageKey) || {
        label: stageLabel,
        pipelineLabel,
        count: 0,
      };
      openStageEntry.count += 1;
      openStagesMap.set(openStageKey, openStageEntry);
    }

    if (monthKey) {
      const monthEntry = monthlyMap.get(monthKey) || {
        monthKey,
        label: formatMonthLabel(monthKey),
        deals: 0,
        wonDeals: 0,
        lostDeals: 0,
        openDeals: 0,
      };
      monthEntry.deals += 1;
      if (status === 'won') {
        monthEntry.wonDeals += 1;
      } else if (status === 'lost') {
        monthEntry.lostDeals += 1;
      } else {
        monthEntry.openDeals += 1;
      }
      monthlyMap.set(monthKey, monthEntry);
    }

    if (dateOnly) {
      const weekStart = getWeekStart(dateOnly);
      const weekKey = formatDate(weekStart);
      const weekEntry = weeklyMap.get(weekKey) || {
        weekKey,
        label: formatWeekLabel(weekStart),
        deals: 0,
      };
      weekEntry.deals += 1;
      weeklyMap.set(weekKey, weekEntry);
    }
  }

  const opportunities = deals.length;
  return {
    updatedAt: source.updatedAt,
    companyName: source.companyName,
    companyDomain: source.companyDomain,
    period: { start, end },
    fields: source.fields,
    summary: {
      opportunities,
      won,
      lost,
      open,
      winRate: opportunities > 0 ? Math.round((won / opportunities) * 1000) / 10 : 0,
      avgDaysToWin: winDays.length > 0 ? Math.round((winDays.reduce((sum, value) => sum + value, 0) / winDays.length) * 10) / 10 : null,
    },
    channels: Array.from(channelsMap.values())
      .map((entry) => ({
        ...entry,
        winRate: entry.deals > 0 ? Math.round((entry.wonDeals / entry.deals) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 10),
    owners: Array.from(ownersMap.values())
      .map((entry) => ({
        ...entry,
        winRate: entry.deals > 0 ? Math.round((entry.wonDeals / entry.deals) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 10),
    pipelines: Array.from(pipelinesMap.values())
      .map((entry) => ({
        ...entry,
        winRate: entry.deals > 0 ? Math.round((entry.wonDeals / entry.deals) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 10),
    openStages: Array.from(openStagesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    lostStages: Array.from(lostStagesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    leadFunnel: Array.from(leadFunnelMap.values())
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 12),
    lostReasons: Array.from(lostReasonsMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    monthly: Array.from(monthlyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
    weekly: Array.from(weeklyMap.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey)).slice(-12),
    recentDeals: deals
      .slice()
      .sort((a, b) => String(b.addTime || '').localeCompare(String(a.addTime || '')))
      .slice(0, 20),
  };
}
