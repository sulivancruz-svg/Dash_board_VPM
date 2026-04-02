import * as XLSX from 'xlsx';
import type { PipedriveDealRecord } from '../data-store';
import { getPipedriveMetricsForRange } from '../pipedrive-metrics';

export interface PipedriveChannelRow {
  canal: string;
  receita: number;
  deals: number;
  transacoes: number;
  ticket: number;
  leads: number;
}

export interface PipedriveMonthRow {
  year: number;
  month: string;
  monthKey: string;
  receita: number;
  deals: number;
}

export interface PipedriveSummary {
  totalRevenue: number;
  totalDeals: number;
  totalTransacoes: number;
  ticketMedio: number;
  totalLeads: number;
  totalLost: number;
  totalWon: number;
  channels: PipedriveChannelRow[];
  monthly: PipedriveMonthRow[];
  period: string | null;
  pipelineDeals: PipedriveDealRecord[];
  mondeDeals: PipedriveDealRecord[];
}

interface PipelineLeadSummary {
  deals: PipedriveDealRecord[];
  period: string | null;
}

const SKIP_SHEETS = new Set(['Resumo por Canal', 'Cruzamento Ganho', 'Com Faturamento Monde', 'Sem Faturamento Monde']);

export function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : round2(value);

  const str = String(value).replace(/[R$\s]/g, '').trim();
  if (!str) return null;

  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  let num: number;
  if (lastComma >= 0 && lastDot >= 0) {
    num = lastDot > lastComma
      ? parseFloat(str.replace(/,/g, ''))
      : parseFloat(str.replace(/\./g, '').replace(',', '.'));
  } else if (lastComma >= 0) {
    const afterComma = str.slice(lastComma + 1);
    num = afterComma.length === 3
      ? parseFloat(str.replace(/,/g, ''))
      : parseFloat(str.replace(',', '.'));
  } else {
    num = parseFloat(str.replace(/[^\d.]/g, ''));
  }

  return Number.isNaN(num) ? null : round2(num);
}

export function parsePipedriveExcel(buffer: Buffer): PipedriveSummary {
  const workbook = XLSX.read(buffer, { cellDates: true, cellFormula: false });
  const norm = (s: string) => s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const consolidatedSummary = parseConsolidatedWorkbook(workbook, norm);
  if (consolidatedSummary) {
    return consolidatedSummary;
  }

  const revenueSummary = findRevenueSummary(workbook, norm);
  const pipelineSummary = findPipelineSummary(workbook, norm);

  if (revenueSummary && pipelineSummary) {
    return mergeRevenueAndPipeline(revenueSummary, pipelineSummary);
  }

  if (revenueSummary) return revenueSummary;
  if (pipelineSummary) return buildSummaryFromDeals([], pipelineSummary.deals, pipelineSummary.period);

  // Formato simples: Deal ID + Faturamento (sem canal — canal vem do Pipedrive direto)
  const mondeSimplesResult = findMondeSimples(workbook, norm);
  if (mondeSimplesResult) return mondeSimplesResult;

  throw new Error('Nenhuma aba compativel encontrada para importar Pipe/Monde');
}

function parseConsolidatedWorkbook(
  workbook: XLSX.WorkBook,
  norm: (s: string) => string,
): PipedriveSummary | null {
  const pipeSheet = workbook.Sheets['Consolidado_Pipe'];
  const mondeSheet = workbook.Sheets['Consolidado_Monde'];

  if (!mondeSheet) {
    return null;
  }

  const pipeRows = pipeSheet
    ? XLSX.utils.sheet_to_json(pipeSheet, { raw: false, defval: null }) as Record<string, any>[]
    : [];
  const mondeRows = XLSX.utils.sheet_to_json(mondeSheet, { raw: false, defval: null }) as Record<string, any>[];
  const resultRows = workbook.Sheets['Resultados']
    ? XLSX.utils.sheet_to_json(workbook.Sheets['Resultados'], { raw: false, defval: null }) as Record<string, any>[]
    : [];

  if (pipeRows.length === 0 && mondeRows.length === 0) {
    return null;
  }

  const pipeKeys = pipeRows.length > 0 ? Object.keys(pipeRows[0]) : [];
  const mondeKeys = mondeRows.length > 0 ? Object.keys(mondeRows[0]) : [];
  const resultKeys = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];

  const pipeDeals = pipeRows.length > 0 ? parseConsolidatedPipeRows(pipeRows, pipeKeys, norm) : [];
  const resultInfoById = buildResultInfoMap(resultRows, resultKeys, norm);
  const pipeById = new Map(pipeDeals.map((deal) => [deal.id, deal]));
  const mondeDeals = parseConsolidatedMondeRows(mondeRows, mondeKeys, norm, pipeById, resultInfoById);

  return buildSummaryFromDeals(mondeDeals, pipeDeals, null);
}

function findRevenueSummary(
  workbook: XLSX.WorkBook,
  norm: (s: string) => string,
): PipedriveSummary | null {
  for (const sheetName of workbook.SheetNames) {
    if (SKIP_SHEETS.has(sheetName)) continue;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null }) as Record<string, any>[];
    if (rows.length === 0) continue;

    const keys = Object.keys(rows[0]);
    const hasCanalKey = keys.some((key) => norm(key).includes('canal'));
    const hasFatKey = keys.some((key) => norm(key).includes('faturamento'));
    if (hasCanalKey && hasFatKey) {
      return parseRawDealsFormat(rows, keys, norm);
    }
  }

  if (workbook.Sheets['Resumo por Canal']) {
    return parseResumoPorCanal(workbook);
  }

  if (
    workbook.Sheets['Cruzamento Ganho']
    || workbook.Sheets['Com Faturamento Monde']
    || workbook.Sheets['Sem Faturamento Monde']
  ) {
    return parseLegacyFormat(workbook);
  }

  return null;
}

function findPipelineSummary(
  workbook: XLSX.WorkBook,
  norm: (s: string) => string,
): PipelineLeadSummary | null {
  const candidateSheetNames = workbook.SheetNames.includes('PIPE')
    ? ['PIPE', ...workbook.SheetNames.filter((name) => name !== 'PIPE')]
    : workbook.SheetNames;

  for (const sheetName of candidateSheetNames) {
    if (SKIP_SHEETS.has(sheetName)) continue;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null }) as Record<string, any>[];
    if (rows.length === 0) continue;

    const keys = Object.keys(rows[0]);
    const hasCanalKey = keys.some((key) => norm(key).includes('canal'));
    const hasStatusKey = keys.some((key) => norm(key).includes('status'));
    const hasIdKey = keys.some((key) => norm(key) === 'negocio - id' || norm(key).includes(' id') || norm(key).includes('id '));
    const hasFatKey = keys.some((key) => norm(key).includes('faturamento'));

    if (hasCanalKey && hasStatusKey && hasIdKey && !hasFatKey) {
      return parsePipelineSheet(rows, keys, norm);
    }
  }

  return null;
}

function parseConsolidatedPipeRows(
  rows: Record<string, any>[],
  keys: string[],
  norm: (s: string) => string,
): PipedriveDealRecord[] {
  const findKey = (needle: string) => keys.find((key) => norm(key).includes(norm(needle)));

  const keyId = findKey('deal') ?? findKey(' id') ?? findKey('id');
  const keyDate = findKey('data oportunidade') ?? findKey('criado');
  const keyChannel = findKey('canal entrada') ?? findKey('canal');
  const keyStatus = findKey('status');

  const deals = new Map<string, PipedriveDealRecord>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const dealId = normalizeDealId(keyId ? row[keyId] : null, `pipe-${index + 1}`);

    const deal = createDealRecord({
      id: dealId,
      createdDate: parseRowDate(keyDate ? row[keyDate] : null),
      canal: getPrimaryChannel(keyChannel ? row[keyChannel] : null),
      status: keyStatus && row[keyStatus] != null ? String(row[keyStatus]).toLowerCase().trim() : '',
      receita: 0,
      hasMondeBilling: false,
    });

    deals.set(dealId, mergeDealRecords(deals.get(dealId), deal));
  }

  return Array.from(deals.values());
}

function buildResultInfoMap(
  rows: Record<string, any>[],
  keys: string[],
  norm: (s: string) => string,
): Map<string, Partial<PipedriveDealRecord>> {
  const findKey = (needle: string) => keys.find((key) => norm(key).includes(norm(needle)));

  const keyId = findKey('deal') ?? findKey(' id') ?? findKey('id');
  const keyChannel = findKey('canal entrada') ?? findKey('canal');
  const keyStatus = findKey('status');

  const resultInfoById = new Map<string, Partial<PipedriveDealRecord>>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const dealId = normalizeDealId(keyId ? row[keyId] : null, `result-${index + 1}`);

    resultInfoById.set(dealId, {
      canal: getPrimaryChannel(keyChannel ? row[keyChannel] : null),
      status: keyStatus && row[keyStatus] != null ? String(row[keyStatus]).toLowerCase().trim() : '',
    });
  }

  return resultInfoById;
}

function parseConsolidatedMondeRows(
  rows: Record<string, any>[],
  keys: string[],
  norm: (s: string) => string,
  pipeById: Map<string, PipedriveDealRecord>,
  resultInfoById: Map<string, Partial<PipedriveDealRecord>>,
): PipedriveDealRecord[] {
  const findKey = (needle: string) => keys.find((key) => norm(key).includes(norm(needle)));

  const keyId = findKey('deal') ?? findKey(' id') ?? findKey('id');
  const keyDate = findKey('data venda') ?? findKey('venda');
  const keyRevenue = findKey('faturamento total') ?? findKey('faturamento');

  // Chave composta dealId::YYYY-MM para tratar corretamente deals parcelados
  // que possuem pagamentos em meses diferentes (ex: jan + mar).
  // Cada mês é contado de forma independente, evitando que a data do primeiro
  // pagamento (janeiro) exclua o deal de filtros posteriores (março).
  const mondeDeals = new Map<string, PipedriveDealRecord>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const revenue = keyRevenue ? parseCurrency(row[keyRevenue]) : null;
    if (!revenue || revenue <= 0) continue;

    const dealId = normalizeDealId(keyId ? row[keyId] : null, `monde-${index + 1}`);
    const createdDate = parseRowDate(keyDate ? row[keyDate] : null);
    const monthKey = createdDate ? createdDate.slice(0, 7) : 'sem-data';
    const compositeKey = `${dealId}::${monthKey}`;

    const pipeDeal = pipeById.get(dealId);
    const resultInfo = resultInfoById.get(dealId);

    const deal = createDealRecord({
      id: dealId,
      createdDate,
      canal: resultInfo?.canal || pipeDeal?.canal || 'Nao Informado',
      status: resultInfo?.status || pipeDeal?.status || '',
      receita: revenue,
      hasMondeBilling: true,
    });

    mondeDeals.set(compositeKey, mergeDealRecords(mondeDeals.get(compositeKey), deal));
  }

  return Array.from(mondeDeals.values());
}

function parseRawDealsFormat(
  rows: Record<string, any>[],
  keys: string[],
  norm: (s: string) => string,
): PipedriveSummary {
  const findKey = (needle: string) => keys.find((key) => norm(key).includes(norm(needle)));

  const keyData = findKey('criado');
  const keyId = findKey(' id') ?? findKey('id ') ?? keys.find((key) => norm(key) === 'id') ?? findKey('id');
  const keyCanal = findKey('canal');
  const keyStatus = findKey('status');
  const keyFat = findKey('faturamento');

  const mondeDeals = new Map<string, PipedriveDealRecord>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const faturamento = keyFat ? parseCurrency(row[keyFat]) : null;
    if (!faturamento || faturamento <= 0) continue;

    const dealId = keyId && row[keyId] != null
      ? String(row[keyId]).trim()
      : `row-${index + 1}`;
    const createdDate = parseRowDate(keyData ? row[keyData] : null);

    if (createdDate) {
      if (!minDate || createdDate < minDate) {
        minDate = createdDate;
      }
      if (!maxDate || createdDate > maxDate) {
        maxDate = createdDate;
      }
    }

    const deal = createDealRecord({
      id: dealId,
      createdDate,
      canal: getPrimaryChannel(keyCanal ? row[keyCanal] : null),
      status: keyStatus && row[keyStatus] != null ? String(row[keyStatus]).toLowerCase().trim() : '',
      receita: faturamento,
      hasMondeBilling: true,
    });

    mondeDeals.set(dealId, mergeDealRecords(mondeDeals.get(dealId), deal));
  }

  return buildSummaryFromDeals(Array.from(mondeDeals.values()), [], buildPeriodLabel(minDate, maxDate));
}

function parsePipelineSheet(
  rows: Record<string, any>[],
  keys: string[],
  norm: (s: string) => string,
): PipelineLeadSummary {
  const findKey = (needle: string) => keys.find((key) => norm(key).includes(norm(needle)));

  const keyData = findKey('criado');
  const keyId = findKey(' id') ?? findKey('id ') ?? keys.find((key) => norm(key) === 'id') ?? findKey('id');
  const keyCanal = findKey('canal');
  const keyStatus = findKey('status');

  const deals = new Map<string, PipedriveDealRecord>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const dealId = keyId && row[keyId] != null
      ? String(row[keyId]).trim()
      : `row-${index + 1}`;
    const createdDate = parseRowDate(keyData ? row[keyData] : null);

    if (createdDate) {
      if (!minDate || createdDate < minDate) {
        minDate = createdDate;
      }
      if (!maxDate || createdDate > maxDate) {
        maxDate = createdDate;
      }
    }

    const deal = createDealRecord({
      id: dealId,
      createdDate,
      canal: getPrimaryChannel(keyCanal ? row[keyCanal] : null),
      status: keyStatus && row[keyStatus] != null ? String(row[keyStatus]).toLowerCase().trim() : '',
      receita: 0,
      hasMondeBilling: false,
    });

    deals.set(dealId, mergeDealRecords(deals.get(dealId), deal));
  }

  return {
    deals: Array.from(deals.values()),
    period: buildPeriodLabel(minDate, maxDate),
  };
}

function mergeRevenueAndPipeline(
  revenue: PipedriveSummary,
  pipeline: PipelineLeadSummary,
): PipedriveSummary {
  const pipelineById = new Map(pipeline.deals.map((deal) => [deal.id, deal]));
  const mergedMondeDeals = revenue.mondeDeals.map((deal) => {
    const pipelineDeal = pipelineById.get(deal.id);
    if (!pipelineDeal) return deal;

    return {
      ...deal,
      createdDate: deal.createdDate || pipelineDeal.createdDate,
      canal: deal.canal !== 'Nao Informado' ? deal.canal : pipelineDeal.canal,
      status: deal.status || pipelineDeal.status,
    };
  });

  return buildSummaryFromDeals(mergedMondeDeals, pipeline.deals, revenue.period || pipeline.period);
}

function buildSummaryFromDeals(
  mondeDeals: PipedriveDealRecord[],
  pipelineDeals: PipedriveDealRecord[],
  fallbackPeriod: string | null,
): PipedriveSummary {
  const metrics = getPipedriveMetricsForRange({
    updatedAt: new Date().toISOString(),
    totalDeals: mondeDeals.length,
    totalRevenue: mondeDeals.reduce((sum, deal) => sum + (deal.receita || 0), 0),
    totalTransacoes: mondeDeals.length,
    ticketMedio: mondeDeals.length > 0
      ? round2(mondeDeals.reduce((sum, deal) => sum + (deal.receita || 0), 0) / mondeDeals.length)
      : 0,
    totalLeads: pipelineDeals.length,
    totalLost: 0,
    totalWon: 0,
    withMondeBilling: mondeDeals.length,
    period: fallbackPeriod,
    channels: [],
    monthly: [],
    pipelineDeals,
    mondeDeals,
  });

  if (!metrics) {
    throw new Error('Nao foi possivel consolidar dados Pipe/Monde');
  }

  return {
    totalRevenue: metrics.totalRevenue,
    totalDeals: metrics.totalDeals,
    totalTransacoes: metrics.totalTransacoes,
    ticketMedio: metrics.ticketMedio,
    totalLeads: metrics.totalLeads,
    totalLost: metrics.totalLost,
    totalWon: metrics.totalWon,
    channels: metrics.channels.map((channel) => ({
      canal: channel.canal,
      receita: channel.receita,
      deals: channel.vendas,
      transacoes: channel.vendas,
      ticket: channel.ticket,
      leads: channel.leads || 0,
    })),
    monthly: metrics.monthly,
    period: metrics.period || fallbackPeriod,
    pipelineDeals,
    mondeDeals,
  };
}

/**
 * Formato simples Monde: apenas Deal ID + Data Venda + Faturamento (sem coluna Canal).
 * O canal será cruzado depois com o Pipedrive direto via buildPipedriveDashboardStore.
 */
function findMondeSimples(
  workbook: XLSX.WorkBook,
  norm: (s: string) => string,
): PipedriveSummary | null {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null }) as Record<string, any>[];
    if (rows.length === 0) continue;

    const keys = Object.keys(rows[0]);
    const hasFatKey = keys.some((k) => norm(k).includes('faturamento'));
    const hasIdKey = keys.some((k) => norm(k) === 'deal' || norm(k).includes('deal') || norm(k).includes(' id') || norm(k).includes('id'));
    const hasCanalKey = keys.some((k) => norm(k).includes('canal'));

    if (!hasFatKey || !hasIdKey || hasCanalKey) continue;

    const findKey = (needle: string) => keys.find((k) => norm(k).includes(norm(needle)));
    const keyId = findKey('deal') ?? findKey(' id') ?? keys.find((k) => norm(k) === 'id') ?? findKey('id');
    const keyFat = findKey('faturamento total') ?? findKey('faturamento');
    const keyDate = findKey('data venda') ?? findKey('data') ?? findKey('criado');

    // Chave composta: Deal ID + Data — para suportar o mesmo deal com pagamentos em meses diferentes
    const mondeDeals = new Map<string, PipedriveDealRecord>();
    let minDate: string | null = null;
    let maxDate: string | null = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const revenue = keyFat ? parseCurrency(row[keyFat]) : null;
      if (!revenue || revenue <= 0) continue;

      const dealId = normalizeDealId(keyId ? row[keyId] : null, `monde-simples-${i + 1}`);
      const createdDate = parseRowDate(keyDate ? row[keyDate] : null);

      if (createdDate) {
        if (!minDate || createdDate < minDate) minDate = createdDate;
        if (!maxDate || createdDate > maxDate) maxDate = createdDate;
      }

      // Chave composta: agrupa por Deal+Mês para preservar pagamentos em meses diferentes
      const monthKey = createdDate ? createdDate.slice(0, 7) : 'sem-data'; // YYYY-MM
      const compositeKey = `${dealId}::${monthKey}`;

      const deal = createDealRecord({
        id: dealId,
        createdDate,
        canal: 'Nao Informado', // será cruzado via Pipedrive direto
        status: 'won',
        receita: revenue,
        hasMondeBilling: true,
      });

      mondeDeals.set(compositeKey, mergeDealRecords(mondeDeals.get(compositeKey), deal));
    }

    if (mondeDeals.size === 0) continue;

    return buildSummaryFromDeals(
      Array.from(mondeDeals.values()),
      [],
      buildPeriodLabel(minDate, maxDate),
    );
  }

  return null;
}

function parseResumoPorCanal(workbook: XLSX.WorkBook): PipedriveSummary {
  const sheet = workbook.Sheets['Resumo por Canal'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const period = rows[1]?.[0] ? String(rows[1][0]).replace('Periodo:', '').trim() : null;
  const summaryRow = rows[4] || [];
  const totalRevenue = parseCurrency(summaryRow[0]) || 0;
  const totalDeals = typeof summaryRow[1] === 'number' ? summaryRow[1] : parseInt(String(summaryRow[1] || '0'), 10);
  const totalTransacoes = typeof summaryRow[2] === 'number' ? summaryRow[2] : parseInt(String(summaryRow[2] || '0'), 10);
  const ticketMedio = parseCurrency(summaryRow[3]) || 0;

  const channels: PipedriveChannelRow[] = [];
  for (let index = 7; index < rows.length; index += 1) {
    const row = rows[index];
    const canalName = row[0] ? String(row[0]).trim() : null;
    if (!canalName || canalName.toUpperCase() === 'TOTAL' || canalName.startsWith('!')) continue;

    const receita = parseCurrency(row[1]) || 0;
    const deals = typeof row[3] === 'number' ? row[3] : parseInt(String(row[3] || '0'), 10);
    const transacoes = typeof row[4] === 'number' ? row[4] : parseInt(String(row[4] || '0'), 10);
    const ticket = parseCurrency(row[5]) || (deals > 0 ? round2(receita / deals) : 0);

    if (receita === 0 && deals === 0) continue;
    channels.push({ canal: canalName, receita, deals, transacoes, ticket, leads: deals });
  }

  return {
    totalRevenue,
    totalDeals,
    totalTransacoes,
    ticketMedio,
    totalLeads: totalDeals,
    totalLost: 0,
    totalWon: totalDeals,
    channels,
    monthly: [],
    period,
    pipelineDeals: [],
    mondeDeals: [],
  };
}

function parseLegacyFormat(workbook: XLSX.WorkBook): PipedriveSummary {
  const sheetNames = ['Cruzamento Ganho', 'Com Faturamento Monde', 'Sem Faturamento Monde'];
  const mondeDeals = new Map<string, PipedriveDealRecord>();

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const headerIdx = rows.findIndex((row) =>
      row.some((cell) => {
        const value = String(cell || '').toLowerCase();
        return value.includes('negocio') || value.includes('deal');
      }),
    );
    if (headerIdx < 0) continue;

    for (let index = headerIdx + 1; index < rows.length; index += 1) {
      const row = rows[index];
      const dealId = row[0];
      if (!dealId || (Number.isNaN(Number(dealId)) && !String(dealId).match(/^\d+$/))) continue;

      const revenue = sheetName === 'Sem Faturamento Monde' ? null : parseCurrency(row[4]);
      if (!revenue || revenue <= 0) continue;

      const deal = createDealRecord({
        id: String(dealId),
        createdDate: null,
        canal: getPrimaryChannel(row[1]),
        status: '',
        receita: revenue,
        hasMondeBilling: true,
      });

      mondeDeals.set(deal.id, mergeDealRecords(mondeDeals.get(deal.id), deal));
    }
  }

  return buildSummaryFromDeals(Array.from(mondeDeals.values()), [], null);
}

function createDealRecord(input: PipedriveDealRecord): PipedriveDealRecord {
  return {
    id: input.id,
    createdDate: input.createdDate,
    canal: input.canal || 'Nao Informado',
    status: input.status || '',
    receita: round2(input.receita || 0),
    hasMondeBilling: input.hasMondeBilling,
  };
}

function mergeDealRecords(
  existing: PipedriveDealRecord | undefined,
  incoming: PipedriveDealRecord,
): PipedriveDealRecord {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    createdDate: existing.createdDate || incoming.createdDate,
    canal: existing.canal !== 'Nao Informado' ? existing.canal : incoming.canal,
    status: existing.status || incoming.status,
    receita: round2((existing.receita || 0) + (incoming.receita || 0)),
    hasMondeBilling: existing.hasMondeBilling || incoming.hasMondeBilling,
  };
}

function getPrimaryChannel(value: any): string {
  if (!value) return 'Nao Informado';
  const channel = String(value).trim();
  if (!channel) return 'Nao Informado';
  return channel.split(', ')[0].trim() || 'Nao Informado';
}

function normalizeDealId(value: any, fallback: string): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const raw = String(value).trim();
  if (!raw) {
    return fallback;
  }

  if (/^\d+(\.0+)?$/.test(raw)) {
    return String(Math.trunc(Number(raw)));
  }

  return raw;
}

function parseRowDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatIsoDate(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw
    .replace(' ', 'T')
    .replace(/T(\d):/, 'T0$1:')
    .replace(/T(\d{2}):(\d):/, 'T$1:0$2:');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return formatIsoDate(parsed);
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  return null;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildPeriodLabel(minDate: string | null, maxDate: string | null): string | null {
  if (!minDate || !maxDate) return null;

  const min = new Date(`${minDate}T00:00:00`);
  const max = new Date(`${maxDate}T00:00:00`);
  if (Number.isNaN(min.getTime()) || Number.isNaN(max.getTime())) return null;

  return `${monthAbbr(min.getMonth())}/${min.getFullYear()} a ${monthAbbr(max.getMonth())}/${max.getFullYear()}`;
}

function monthAbbr(index: number): string {
  return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][index] || 'Mes';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
