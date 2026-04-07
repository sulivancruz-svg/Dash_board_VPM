import { kvDel, kvGet, kvSet } from '@/lib/storage';
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
  await kvSet('meta-token', data);
}

export async function getMetaToken(): Promise<MetaTokenStore | null> {
  const data = await kvGet<EncryptedTokenStore | LegacyTokenStore>('meta-token');
  if (data) {
    try {
      if (isEncryptedStore(data)) {
        return {
          token: decryptToken(data.encryptedToken, data.iv),
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
      console.error('Error decoding meta token:', error);
    }
  }

  // Fallback: variáveis de ambiente fixas no Vercel
  const envToken = process.env.META_ACCESS_TOKEN;
  const rawAccountId = process.env.META_AD_ACCOUNT_ID || '';
  // Meta exige formato act_XXXXX — adiciona prefixo se ausente
  const envAccountId = rawAccountId && !rawAccountId.startsWith('act_')
    ? `act_${rawAccountId}`
    : rawAccountId;
  if (envToken && envAccountId) {
    return {
      token: envToken,
      accountId: envAccountId,
      accountName: process.env.META_ACCOUNT_NAME || 'Vai Pro Mundo',
    };
  }

  return null;
}

export async function clearMetaToken(): Promise<void> {
  await kvDel('meta-token');
}
