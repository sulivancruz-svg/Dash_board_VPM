import { blobGetJson, blobSetJson, kvGet, kvSet } from '@/lib/storage';

export interface ChannelSales {
  canal: string;
  vendas: number;
  receita: number;
  ticket: number;
  leads?: number;
  qualificados?: number;
}

export interface SdrStore {
  updatedAt: string;
  totalLeads: number;
  totalQualified: number;
  totalSales: number;
  totalRevenue: number;
  channels: ChannelSales[];
  months: { month: string; year?: number; leads: number; qualified: number; sales: number }[];
}

export interface MonthlyRevenue {
  year: number;
  month: string;
  monthKey: string;
  receita: number;
  deals: number;
}

export interface PipedriveDealRecord {
  id: string;
  createdDate: string | null;
  canal: string;
  status: string;
  receita: number;
  hasMondeBilling: boolean;
}

export interface PipedriveStore {
  updatedAt: string;
  totalDeals: number;
  totalRevenue: number;
  totalTransacoes: number;
  ticketMedio: number;
  totalLeads: number;
  totalLost: number;
  totalWon: number;
  withMondeBilling: number;
  period: string | null;
  channels: ChannelSales[];
  monthly: MonthlyRevenue[];
  pipelineDeals?: PipedriveDealRecord[];
  mondeDeals?: PipedriveDealRecord[];
}

/* ── SDR (small → KV) ─────────────────────────────── */

export async function setSdrData(data: SdrStore): Promise<void> {
  await kvSet('sdr-data', data);
}

export async function getSdrData(): Promise<SdrStore | null> {
  return kvGet<SdrStore>('sdr-data');
}

/* ── Pipedrive Monde (large → Blob) ───────────────── */

export async function setPipedriveData(data: PipedriveStore): Promise<void> {
  await blobSetJson('pipedrive-data', data);
}

export async function getPipedriveData(): Promise<PipedriveStore | null> {
  return blobGetJson<PipedriveStore>('pipedrive-data');
}
