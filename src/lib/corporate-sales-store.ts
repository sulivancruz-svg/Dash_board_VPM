import { blobGetJson, blobSetJson, blobDel } from '@/lib/storage';

export interface CorporateSale {
  vendaNumero: number;
  dataVenda: string; // ISO date
  vendedor: string;
  cliente: string;
  clienteGrupo: string;
  produto: string;
  fornecedor: string;
  dataInicio: string | null; // ISO date
  dataFim: string | null; // ISO date
  destino: string;
  tipoPessoa: string;
  situacao: string;
  receitas: number;
  faturamento: number;
  antecedenciaDias: number | null;
  perfilCliente: 'Urgente' | 'Normal' | 'Planejado' | null;
}

export interface CorporateSalesData {
  updatedAt: string;
  source: 'google-sheets';
  sheetId: string;
  totalRecords: number;
  sales: CorporateSale[];
}

export interface CorporateSalesSnapshot {
  date: string; // YYYY-MM-DD
  totalRecords: number;
  totalReceitas: number;
  totalFaturamento: number;
  bySeller: Record<string, { vendas: number; receitas: number; faturamento: number }>;
  byClient: Record<string, { vendas: number; receitas: number; faturamento: number }>;
  byProduct: Record<string, { vendas: number; receitas: number; faturamento: number }>;
}

const DATA_KEY = 'corporate-sales-data';
const HISTORY_KEY = 'corporate-sales-history';

export async function getCorporateSalesData(): Promise<CorporateSalesData | null> {
  return await blobGetJson<CorporateSalesData>(DATA_KEY);
}

export async function setCorporateSalesData(data: CorporateSalesData): Promise<void> {
  await blobSetJson(DATA_KEY, data);
}

export async function clearCorporateSalesData(): Promise<void> {
  await blobDel(DATA_KEY);
}

export async function getCorporateSalesHistory(): Promise<CorporateSalesSnapshot[]> {
  const history = await blobGetJson<CorporateSalesSnapshot[]>(HISTORY_KEY);
  return history || [];
}

export async function appendCorporateSalesSnapshot(snapshot: CorporateSalesSnapshot): Promise<void> {
  const history = await getCorporateSalesHistory();
  // Replace same-day snapshot if exists, else append
  const filtered = history.filter((s) => s.date !== snapshot.date);
  filtered.push(snapshot);
  // Keep last 365 days
  const sorted = filtered.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = sorted.slice(-365);
  await blobSetJson(HISTORY_KEY, trimmed);
}

/**
 * Build a snapshot summary from current sales data.
 */
export function buildSnapshot(data: CorporateSalesData): CorporateSalesSnapshot {
  const today = new Date().toISOString().split('T')[0];
  const bySeller: Record<string, { vendas: number; receitas: number; faturamento: number }> = {};
  const byClient: Record<string, { vendas: number; receitas: number; faturamento: number }> = {};
  const byProduct: Record<string, { vendas: number; receitas: number; faturamento: number }> = {};

  let totalReceitas = 0;
  let totalFaturamento = 0;

  for (const sale of data.sales) {
    totalReceitas += sale.receitas;
    totalFaturamento += sale.faturamento;

    if (!bySeller[sale.vendedor]) bySeller[sale.vendedor] = { vendas: 0, receitas: 0, faturamento: 0 };
    bySeller[sale.vendedor].vendas += 1;
    bySeller[sale.vendedor].receitas += sale.receitas;
    bySeller[sale.vendedor].faturamento += sale.faturamento;

    const clientKey = sale.clienteGrupo || sale.cliente || 'Desconhecido';
    if (!byClient[clientKey]) byClient[clientKey] = { vendas: 0, receitas: 0, faturamento: 0 };
    byClient[clientKey].vendas += 1;
    byClient[clientKey].receitas += sale.receitas;
    byClient[clientKey].faturamento += sale.faturamento;

    const productKey = sale.produto || 'Desconhecido';
    if (!byProduct[productKey]) byProduct[productKey] = { vendas: 0, receitas: 0, faturamento: 0 };
    byProduct[productKey].vendas += 1;
    byProduct[productKey].receitas += sale.receitas;
    byProduct[productKey].faturamento += sale.faturamento;
  }

  return {
    date: today,
    totalRecords: data.totalRecords,
    totalReceitas,
    totalFaturamento,
    bySeller,
    byClient,
    byProduct,
  };
}
