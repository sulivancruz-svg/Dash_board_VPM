import { blobDel, blobGetJson, blobSetJson, kvDel, kvGet, kvSet } from '@/lib/storage';
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
  const store = await kvGet<EncryptedConfigStore>('pipedrive-direct-config');
  if (!store?.encryptedToken || !store.iv || !store.companyDomain) return null;

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
  await kvSet('pipedrive-direct-config', payload);
}

export async function clearPipedriveDirectCredentials(): Promise<void> {
  await kvDel('pipedrive-direct-config');
}

export async function getPipedriveDirectData(): Promise<PipedriveDirectData | null> {
  return blobGetJson<PipedriveDirectData>('pipedrive-direct-data');
}

export async function setPipedriveDirectData(data: PipedriveDirectData): Promise<void> {
  await blobSetJson('pipedrive-direct-data', data);
}

export async function clearPipedriveDirectData(): Promise<void> {
  await blobDel('pipedrive-direct-data');
}
