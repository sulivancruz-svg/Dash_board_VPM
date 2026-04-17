import crypto from 'crypto';

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(`dashboard-encryption:${secret}`, 'utf8').digest();
}

function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY?.trim();

  if (encryptionKey) {
    // Preserve compatibility with existing 32-char raw keys already in use.
    if (encryptionKey.length === 32) {
      return Buffer.from(encryptionKey, 'utf8');
    }

    return deriveKey(encryptionKey);
  }

  const authSecret = process.env.NEXTAUTH_SECRET?.trim();
  if (authSecret) {
    return deriveKey(authSecret);
  }

  throw new Error('Configure ENCRYPTION_KEY ou NEXTAUTH_SECRET para criptografar tokens');
}

export interface EncryptedToken {
  encrypted: string;
  iv: string;
}

export function encryptToken(token: string): EncryptedToken {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted + ':' + authTag.toString('hex'),
    iv: iv.toString('hex'),
  };
}

export function decryptToken(encrypted: string, iv: string): string {
  const [encryptedData, authTag] = encrypted.split(':');

  if (!encryptedData || !authTag) {
    throw new Error('Invalid encrypted token format');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
