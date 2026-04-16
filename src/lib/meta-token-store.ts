import { blobDel, blobGetJson, blobSetJson } from '@/lib/storage';
import { decryptToken, encryptToken } from '@/lib/crypto';

interface EncryptedTokenStore {
  version: 2;
  encryptedToken: string;
  iv: string;
  accountId: string;
  accountName: string;
}

interface LegacyTokenStore {
  token: string;
  accountId: string;
  accountName: string;
}

export interface MetaTokenStore {
  token: string;
  accountId: string;
  accountName: string;
}

function isEncryptedStore(
  data: EncryptedTokenStore | LegacyTokenStore,
): data is EncryptedTokenStore {
  return 'encryptedToken' in data && 'iv' in data && (data as EncryptedTokenStore).version === 2;
}

export async function setMetaToken(
  token: string,
  accountId: string,
  accountName: string,
): Promise<void> {
  const encrypted = encryptToken(token);
  const data: EncryptedTokenStore = {
    version: 2,
    encryptedToken: encrypted.encrypted,
    iv: encrypted.iv,
    accountId,
    accountName,
  };
  console.log('[meta-token] Saving token for account:', accountId);
  await blobSetJson('meta-token', data);
  console.log('[meta-token] Token saved successfully');
}

export async function getMetaToken(): Promise<MetaTokenStore | null> {
  const data = await blobGetJson<EncryptedTokenStore | LegacyTokenStore>('meta-token');
  if (data) {
    console.log('[meta-token] Blob data found, account:', (data as any).accountId);
    try {
      if (isEncryptedStore(data)) {
        const token = decryptToken(data.encryptedToken, data.iv);
        console.log('[meta-token] Decrypted token from blob successfully');
        return {
          token,
          accountId: data.accountId,
          accountName: data.accountName,
        };
      }

      const legacy = data as LegacyTokenStore;
      if (legacy.token && legacy.accountId) {
        // Migrate legacy plaintext storage to encrypted format
        await setMetaToken(legacy.token, legacy.accountId, legacy.accountName);
        return { token: legacy.token, accountId: legacy.accountId, accountName: legacy.accountName };
      }
    } catch (error) {
      console.error('[meta-token] Error decoding blob data:', error);
      // If a stored token exists but cannot be decoded, avoid falling back to
      // META_ACCESS_TOKEN. That fallback can hide encryption-key mismatch and
      // make the app use an unrelated expired token from the environment.
      return null;
    }
  }

  console.log('[meta-token] No blob found, checking env vars');
  // Fallback: variáveis de ambiente fixas no Vercel
  const envToken = process.env.META_ACCESS_TOKEN;
  const rawAccountId = process.env.META_AD_ACCOUNT_ID || '';
  // Meta exige formato act_XXXXX — adiciona prefixo se ausente
  const envAccountId = rawAccountId && !rawAccountId.startsWith('act_')
    ? `act_${rawAccountId}`
    : rawAccountId;
  if (envToken && envAccountId) {
    console.log('[meta-token] Using env var token for account:', envAccountId);
    return {
      token: envToken,
      accountId: envAccountId,
      accountName: process.env.META_ACCOUNT_NAME || 'Vai Pro Mundo',
    };
  }

  console.log('[meta-token] No token available');
  return null;
}

export async function clearMetaToken(): Promise<void> {
  await blobDel('meta-token');
}
