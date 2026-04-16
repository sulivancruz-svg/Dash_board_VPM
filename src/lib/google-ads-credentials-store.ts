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

function getEnvCredentials(): GoogleAdsCredentials | null {
  const jsonStr = process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!jsonStr || !developerToken || !customerId) return null;

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.private_key || !parsed.client_email) return null;

    return {
      serviceAccountEmail: parsed.client_email,
      privateKey: parsed.private_key,
      privateKeyId: parsed.private_key_id || undefined,
      developerToken,
      customerId: customerId.replace(/-/g, ''),
      managerCustomerId: process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID?.replace(/-/g, '') || undefined,
      configuredAt: 'env',
    };
  } catch {
    return null;
  }
}

export async function getGoogleAdsCredentials(): Promise<GoogleAdsCredentials | null> {
  try {
    const stored = await blobGetJson<GoogleAdsCredentials>(BLOB_KEY);
    if (stored) return stored;
  } catch {
    // Blob unavailable, fall through to env vars
  }

  return getEnvCredentials();
}

export async function setGoogleAdsCredentials(creds: GoogleAdsCredentials): Promise<void> {
  await blobSetJson(BLOB_KEY, creds);
}

export async function deleteGoogleAdsCredentials(): Promise<void> {
  await blobDel(BLOB_KEY);
}
