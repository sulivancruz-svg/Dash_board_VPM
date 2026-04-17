import { blobDel, blobGetJson, blobSetJson } from '@/lib/storage';
import { decryptToken, encryptToken } from '@/lib/crypto';

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
  value: number | null;
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

export async function getPipedriveDirectCredentials(): Promise<PipedriveDirectCredentials | null> {
  const store = await blobGetJson<EncryptedConfigStore>('pipedrive-direct-config');
  if (store?.encryptedToken && store.iv && store.companyDomain) {
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
    }
  }

  // Fallback: variáveis de ambiente fixas no Vercel
  const envToken = process.env.PIPEDRIVE_API_TOKEN;
  const envDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;
  if (envToken && envDomain) {
    return {
      apiToken: envToken,
      companyName: 'Vai Pro Mundo',
      companyDomain: envDomain,
      connectedAt: '',
      lastValidatedAt: '',
    };
  }

  return null;
}

export async function setPipedriveDirectCredentials(input: {
  apiToken: string;
  companyName: string;
  companyDomain: string;
}): Promise<void> {
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
  await blobSetJson('pipedrive-direct-config', payload, 'private');
}

export async function clearPipedriveDirectCredentials(): Promise<void> {
  await blobDel('pipedrive-direct-config');
}

export async function getPipedriveDirectData(): Promise<PipedriveDirectData | null> {
  const data = await blobGetJson<PipedriveDirectData>('pipedrive-direct-data');
  if (data) {
    console.log('[pipedrive-direct] Data loaded:', data.totalDeals, 'deals');
  } else {
    console.log('[pipedrive-direct] No data found in blob');
  }
  return data;
}

export async function setPipedriveDirectData(data: PipedriveDirectData): Promise<void> {
  console.log('[pipedrive-direct] Saving data:', data.totalDeals, 'deals, updated:', data.updatedAt);
  await blobSetJson('pipedrive-direct-data', data);
  console.log('[pipedrive-direct] Data saved successfully');
}

export async function clearPipedriveDirectData(): Promise<void> {
  await blobDel('pipedrive-direct-data');
}
