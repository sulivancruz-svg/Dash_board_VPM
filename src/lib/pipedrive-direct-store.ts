import fs from 'fs';
import path from 'path';
import { decryptToken, encryptToken } from '@/lib/crypto';

const CONFIG_FILE = path.join(process.cwd(), '.pipedrive-direct-config.json');
const DATA_FILE = path.join(process.cwd(), '.pipedrive-direct-data.json');

interface EncryptedConfigStore {
  version: 2;
  encryptedToken: string;
  iv: string;
  companyName: string;
  companyDomain: string;
  connectedAt: string;
  lastValidatedAt: string;
}

export interface PipedriveDirectCredentials {
  apiToken: string;
  companyName: string;
  companyDomain: string;
  connectedAt: string;
  lastValidatedAt: string;
}

export interface PipedriveDirectChannelRow {
  canal: string;
  deals: number;
  wonDeals: number;
}

export interface PipedriveDirectMonthRow {
  monthKey: string;
  label: string;
  deals: number;
  wonDeals: number;
}

export interface PipedriveDirectRecentDeal {
  id: number;
  title: string;
  status: string;
  ownerId: number | null;
  currency: string | null;
  addTime: string | null;
  wonTime: string | null;
  ownerName: string | null;
  canal: string;
  howArrived: string | null;
  lostReason: string | null;
  stageId: number | null;
  pipelineId: number | null;
  stageName: string | null;
  pipelineName: string | null;
}

export interface PipedriveDirectData {
  updatedAt: string;
  companyName: string;
  companyDomain: string;
  totalDeals: number;
  totalOpen: number;
  totalWon: number;
  totalLost: number;
  fields: {
    channelFieldName: string | null;
    howArrivedFieldName: string | null;
  };
  channels: PipedriveDirectChannelRow[];
  monthly: PipedriveDirectMonthRow[];
  recentDeals: PipedriveDirectRecentDeal[];
  allDeals: PipedriveDirectRecentDeal[];
}

function readConfigFile(): EncryptedConfigStore | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as EncryptedConfigStore;
  } catch (error) {
    console.error('Error reading Pipedrive direct config:', error);
    return null;
  }
}

export function getPipedriveDirectCredentials(): PipedriveDirectCredentials | null {
  const store = readConfigFile();
  if (!store?.encryptedToken || !store.iv || !store.companyDomain) {
    return null;
  }

  try {
    return {
      apiToken: decryptToken(store.encryptedToken, store.iv),
      companyName: store.companyName,
      companyDomain: store.companyDomain,
      connectedAt: store.connectedAt,
      lastValidatedAt: store.lastValidatedAt,
    };
  } catch (error) {
    console.error('Error decoding Pipedrive direct token:', error);
    return null;
  }
}

export function setPipedriveDirectCredentials(input: {
  apiToken: string;
  companyName: string;
  companyDomain: string;
}): void {
  const encrypted = encryptToken(input.apiToken);
  const now = new Date().toISOString();
  const payload: EncryptedConfigStore = {
    version: 2,
    encryptedToken: encrypted.encrypted,
    iv: encrypted.iv,
    companyName: input.companyName,
    companyDomain: input.companyDomain,
    connectedAt: now,
    lastValidatedAt: now,
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

export function clearPipedriveDirectCredentials(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (error) {
    console.error('Error clearing Pipedrive direct config:', error);
  }
}

export function getPipedriveDirectData(): PipedriveDirectData | null {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as PipedriveDirectData;
  } catch (error) {
    console.error('Error reading Pipedrive direct data:', error);
    return null;
  }
}

export function setPipedriveDirectData(data: PipedriveDirectData): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving Pipedrive direct data:', error);
  }
}

export function clearPipedriveDirectData(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  } catch (error) {
    console.error('Error clearing Pipedrive direct data:', error);
  }
}
