/**
 * Storage adapter: Vercel KV + Blob in production, filesystem in local dev.
 *
 * Env vars set automatically by Vercel when you add a KV store:
 *   KV_REST_API_URL, KV_REST_API_TOKEN
 * And for Blob:
 *   BLOB_READ_WRITE_TOKEN
 */
import fs from 'fs';
import path from 'path';

const IS_KV = !!process.env.KV_REST_API_URL;
const IS_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_BASE = IS_VERCEL ? '/tmp' : process.cwd();
type BlobAccessMode = 'public' | 'private';
let resolvedBlobAccessMode: BlobAccessMode | null = null;

export interface StorageStatus {
  hasBlob: boolean;
  hasKv: boolean;
  hasPersistentStorage: boolean;
  mode: 'persistent' | 'ephemeral';
  runtime: 'vercel' | 'local';
}

export function getStorageStatus(): StorageStatus {
  const hasPersistentStorage = IS_BLOB || IS_KV;
  return {
    hasBlob: IS_BLOB,
    hasKv: IS_KV,
    hasPersistentStorage,
    mode: IS_VERCEL && !hasPersistentStorage ? 'ephemeral' : 'persistent',
    runtime: IS_VERCEL ? 'vercel' : 'local',
  };
}

function shouldBlockEphemeralPersistence(): boolean {
  return IS_VERCEL && !IS_BLOB && !IS_KV;
}

function shouldUseLocalFallback(): boolean {
  return !IS_VERCEL;
}

function getEphemeralStorageError(operation: string): Error {
  return new Error(
    `${operation} requer storage persistente na Vercel. Conecte Vercel Blob ou KV; o fallback local nao mantem tokens entre execucoes.`,
  );
}

function warnEphemeralRead(operation: string, key: string): void {
  console.error(`[storage] ${operation}(${key}) sem Blob/KV na Vercel; ignorando fallback efemero`);
}

function localFilePath(key: string): string {
  return path.join(LOCAL_BASE, `.${key}.json`);
}

function localBlobPath(key: string): string {
  return path.join(LOCAL_BASE, `${key}.json`);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getAlternateBlobAccess(access: BlobAccessMode): BlobAccessMode {
  return access === 'private' ? 'public' : 'private';
}

function buildBlobAccessOrder(preferred: BlobAccessMode): BlobAccessMode[] {
  const order: BlobAccessMode[] = [];

  for (const candidate of [resolvedBlobAccessMode, preferred, getAlternateBlobAccess(preferred)]) {
    if (candidate && !order.includes(candidate)) {
      order.push(candidate);
    }
  }

  return order;
}

function rememberBlobAccessMode(access: BlobAccessMode): void {
  resolvedBlobAccessMode = access;
}

/* KV */

export async function kvGet<T>(key: string): Promise<T | null> {
  if (IS_KV) {
    const { kv } = await import('@vercel/kv');
    return await kv.get<T>(key);
  }
  if (shouldBlockEphemeralPersistence()) {
    warnEphemeralRead('kvGet', key);
    return null;
  }
  if (!shouldUseLocalFallback()) {
    return null;
  }
  const file = localFilePath(key);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
    }
  } catch (e) {
    console.error(`[storage] kvGet(${key}) local error:`, e);
  }
  return null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (IS_KV) {
    const { kv } = await import('@vercel/kv');
    await kv.set(key, value);
    return;
  }
  if (shouldBlockEphemeralPersistence()) {
    throw getEphemeralStorageError(`kvSet(${key})`);
  }
  if (!shouldUseLocalFallback()) {
    throw new Error(`kvSet(${key}) falhou sem fallback local disponivel na Vercel.`);
  }
  const file = localFilePath(key);
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

export async function kvDel(key: string): Promise<void> {
  if (IS_KV) {
    const { kv } = await import('@vercel/kv');
    await kv.del(key);
    return;
  }
  if (shouldBlockEphemeralPersistence()) {
    throw getEphemeralStorageError(`kvDel(${key})`);
  }
  if (!shouldUseLocalFallback()) {
    throw new Error(`kvDel(${key}) falhou sem fallback local disponivel na Vercel.`);
  }
  const file = localFilePath(key);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

/* Blob */

export async function blobGetJson<T>(key: string): Promise<T | null> {
  if (IS_BLOB) {
    let blobError: unknown = null;
    try {
      const { get } = await import('@vercel/blob');
      const pathname = `${key}.json`;

      for (const access of buildBlobAccessOrder('private')) {
        try {
          const result = await get(pathname, { access });
          if (!result) {
            continue;
          }

          const payload = await new Response(result.stream).text();
          if (!payload) {
            return null;
          }

          rememberBlobAccessMode(access);
          return JSON.parse(payload) as T;
        } catch (error) {
          blobError = error;
        }
      }
    } catch (e) {
      blobError = e;
    }

    if (blobError) {
      console.error(`[storage] blobGetJson(${key}) blob failed, falling back to KV:`, blobError);
    }
  }

  if (IS_KV) {
    try {
      const { kv } = await import('@vercel/kv');
      return await kv.get<T>(key);
    } catch (e) {
      console.error(`[storage] blobGetJson(${key}) KV error:`, e);
    }
  }

  if (shouldBlockEphemeralPersistence()) {
    warnEphemeralRead('blobGetJson', key);
    return null;
  }
  if (!shouldUseLocalFallback()) {
    return null;
  }
  const file = localBlobPath(key);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
    }
  } catch (e) {
    console.error(`[storage] blobGetJson(${key}) local error:`, e);
  }
  return null;
}

export async function blobSetJson(
  key: string,
  value: unknown,
  access: 'public' | 'private' = 'public',
): Promise<void> {
  let blobFailure: unknown = null;

  if (IS_BLOB) {
    try {
      const { put } = await import('@vercel/blob');
      const payload = JSON.stringify(value);
      const pathname = `${key}.json`;

      for (const candidateAccess of buildBlobAccessOrder(access)) {
        try {
          await put(pathname, payload, {
            access: candidateAccess,
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: 'application/json',
          } as Parameters<typeof put>[2]);
          rememberBlobAccessMode(candidateAccess);
          return;
        } catch (error) {
          blobFailure = error;
        }
      }
    } catch (e) {
      blobFailure = e;
    }

    console.error(`[storage] blobSetJson(${key}) blob failed, falling back to KV:`, blobFailure);
  }

  if (IS_KV) {
    const { kv } = await import('@vercel/kv');
    await kv.set(key, value);
    return;
  }

  if (shouldBlockEphemeralPersistence()) {
    throw getEphemeralStorageError(`blobSetJson(${key})`);
  }
  if (!shouldUseLocalFallback()) {
    const detail = blobFailure ? ` Detalhe do Blob: ${getErrorMessage(blobFailure)}` : '';
    throw new Error(`blobSetJson(${key}) falhou sem fallback local disponivel na Vercel.${detail}`);
  }

  const file = localBlobPath(key);
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

export async function blobDel(key: string): Promise<void> {
  if (IS_BLOB) {
    try {
      const { del } = await import('@vercel/blob');
      await del(`${key}.json`);
    } catch (e) {
      console.error(`[storage] blobDel(${key}) blob failed:`, e);
    }
  }
  if (IS_KV) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.del(key);
    } catch {
      // ignore
    }
    return;
  }
  if (shouldBlockEphemeralPersistence()) {
    throw getEphemeralStorageError(`blobDel(${key})`);
  }
  if (!shouldUseLocalFallback()) {
    throw new Error(`blobDel(${key}) falhou sem fallback local disponivel na Vercel.`);
  }
  const file = localBlobPath(key);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

export async function blobUploadFile(
  blobPath: string,
  buffer: Buffer,
  contentType = 'application/octet-stream',
  access: 'public' | 'private' = 'private',
): Promise<string> {
  if (IS_BLOB) {
    const { put } = await import('@vercel/blob');
    let blobFailure: unknown = null;

    for (const candidateAccess of buildBlobAccessOrder(access)) {
      try {
        const result = await put(blobPath, buffer, {
          access: candidateAccess,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType,
        } as Parameters<typeof put>[2]);
        rememberBlobAccessMode(candidateAccess);
        return result.url;
      } catch (error) {
        blobFailure = error;
      }
    }

    throw new Error(`blobUploadFile(${blobPath}) falhou no Blob. Detalhe do Blob: ${getErrorMessage(blobFailure)}`);
  }
  if (shouldBlockEphemeralPersistence()) {
    throw getEphemeralStorageError(`blobUploadFile(${blobPath})`);
  }
  if (!shouldUseLocalFallback()) {
    throw new Error(`blobUploadFile(${blobPath}) falhou sem fallback local disponivel na Vercel.`);
  }
  const localPath = blobPath.startsWith('branding-assets/')
    ? path.join(process.cwd(), 'public', blobPath)
    : path.join(process.cwd(), 'historical-imports', blobPath.replace('historical-imports/', ''));
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  return `/${blobPath}`;
}

export async function blobDeleteFile(urlOrPath: string): Promise<void> {
  if (IS_BLOB) {
    if (urlOrPath.startsWith('https://')) {
      const { del } = await import('@vercel/blob');
      await del([urlOrPath]);
    }
    return;
  }
  if (shouldBlockEphemeralPersistence()) {
    throw getEphemeralStorageError(`blobDeleteFile(${urlOrPath})`);
  }
  if (!shouldUseLocalFallback()) {
    throw new Error(`blobDeleteFile(${urlOrPath}) falhou sem fallback local disponivel na Vercel.`);
  }
  let localPath: string;
  if (urlOrPath.startsWith('/branding-assets/')) {
    localPath = path.join(process.cwd(), 'public', urlOrPath.replace(/^\//, ''));
  } else if (urlOrPath.startsWith('/historical-imports/')) {
    localPath = path.join(process.cwd(), urlOrPath.replace(/^\//, ''));
  } else {
    return;
  }
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
}
