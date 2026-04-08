import { blobDel, blobGetJson, blobSetJson } from '@/lib/storage';

export interface GoogleAdsCredentials {
  serviceAccountEmail: string;
  privateKey: string;
  privateKeyId?: string;
  developerToken: string;
  customerId: string;
  managerCustomerId?: string;
  configuredAt: string;
}

const BLOB_KEY = 'google-ads-credentials';

export async function getGoogleAdsCredentials(): Promise<GoogleAdsCredentials | null> {
  return blobGetJson<GoogleAdsCredentials>(BLOB_KEY);
}

export async function setGoogleAdsCredentials(creds: GoogleAdsCredentials): Promise<void> {
  await blobSetJson(BLOB_KEY, creds);
}

export async function deleteGoogleAdsCredentials(): Promise<void> {
  await blobDel(BLOB_KEY);
}
