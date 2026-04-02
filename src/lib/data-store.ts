import fs from 'fs';
import path from 'path';

const SDR_FILE = path.join(process.cwd(), '.sdr-data.json');
const PIPEDRIVE_FILE = path.join(process.cwd(), '.pipedrive-data.json');

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

export function setSdrData(data: SdrStore): void {
  try {
    fs.writeFileSync(SDR_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving SDR data:', e);
  }
}

export function getSdrData(): SdrStore | null {
  try {
    if (fs.existsSync(SDR_FILE)) {
      return JSON.parse(fs.readFileSync(SDR_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading SDR data:', e);
  }
  return null;
}

export function setPipedriveData(data: PipedriveStore): void {
  try {
    fs.writeFileSync(PIPEDRIVE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving Pipedrive data:', e);
  }
}

export function getPipedriveData(): PipedriveStore | null {
  try {
    if (fs.existsSync(PIPEDRIVE_FILE)) {
      return JSON.parse(fs.readFileSync(PIPEDRIVE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading Pipedrive data:', e);
  }
  return null;
}
