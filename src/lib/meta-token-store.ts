import fs from 'fs';
import path from 'path';
import { decryptToken, encryptToken } from '@/lib/crypto';

const STORE_FILE = path.join(process.cwd(), '.meta-token.json');

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

function readStoreFile(): EncryptedTokenStore | LegacyTokenStore | null {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading meta token store:', error);
    return null;
  }
}

function isEncryptedStore(data: EncryptedTokenStore | LegacyTokenStore): data is EncryptedTokenStore {
  return 'encryptedToken' in data && 'iv' in data && data.version === 2;
}

function persistEncryptedToken(token: string, accountId: string, accountName: string): void {
  const encrypted = encryptToken(token);
  const data: EncryptedTokenStore = {
    version: 2,
    encryptedToken: encrypted.encrypted,
    iv: encrypted.iv,
    accountId,
    accountName,
  };

  fs.writeFileSync(STORE_FILE, JSON.stringify(data), 'utf-8');
}

export function setMetaToken(token: string, accountId: string, accountName: string): void {
  try {
    persistEncryptedToken(token, accountId, accountName);
  } catch (error) {
    console.error('Error saving meta token:', error);
    throw error;
  }
}

export function getMetaToken(): MetaTokenStore | null {
  const data = readStoreFile();

  if (!data) {
    return null;
  }

  try {
    if (isEncryptedStore(data)) {
      return {
        token: decryptToken(data.encryptedToken, data.iv),
        accountId: data.accountId,
        accountName: data.accountName,
      };
    }

    const legacy = data as LegacyTokenStore;

    if (!legacy.token || !legacy.accountId) {
      return null;
    }

    // Migrate legacy plaintext storage to encrypted format on first read.
    persistEncryptedToken(legacy.token, legacy.accountId, legacy.accountName);

    return {
      token: legacy.token,
      accountId: legacy.accountId,
      accountName: legacy.accountName,
    };
  } catch (error) {
    console.error('Error decoding meta token:', error);
    return null;
  }
}

export function clearMetaToken(): void {
  try {
    if (fs.existsSync(STORE_FILE)) {
      fs.unlinkSync(STORE_FILE);
    }
  } catch (error) {
    console.error('Error clearing meta token:', error);
  }
}
