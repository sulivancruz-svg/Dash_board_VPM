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
// Em produção Vercel sem KV/Blob, o filesystem raiz é read-only — usa /tmp como fallback
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_BASE = IS_VERCEL ? '/tmp' : process.cwd();
function localFilePath(key: string): string {
  return path.join(LOCAL_BASE, `.${key}.json`);
}
function localBlobPath(key: string): string {
  return path.join(LOCAL_BASE, `${key}.json`);
}

/* ─────────────────────────────────────────── KV ─── */

/** Read a JSON value from KV (prod) or a local .json file (dev). */
export async function kvGet<T>(key: string): Promise<T | null> {
  if (IS_KV) {
    const { kv } = await import('@vercel/kv');
    return await kv.get<T>(key);
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

/** Write a JSON value to KV (prod) or a local .json file (dev). */
export async function kvSet(key: string, value: unknown): Promise<void> {
  if (IS_KV) {
    const { kv } = await import('@vercel/kv');
    await kv.set(key, value);
    return;
  }
  const file = localFilePath(key);
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

/** Delete a key from KV (prod) or delete the local .json file (dev). */
export async function kvDel(key: string): Promise<void> {
  if (IS_KV) {
    const { kv } = await import('@vercel/kv');
    await kv.del(key);
    return;
  }
  const file = localFilePath(key);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/* ─────────────────────────────────────────── Blob ─── */

/**
 * Read a large JSON blob (prod: Vercel Blob, dev: local file).
 * Key maps to filename WITHOUT extension (e.g. 'pipedrive-data').
 */
export async function blobGetJson<T>(key: string): Promise<T | null> {
  if (IS_BLOB) {
    try {
      const { list } = await import('@vercel/blob');
      const result = await list({ prefix: `${key}.json`, limit: 1 });
      const blobs = result?.blobs ?? [];
      if (blobs.length === 0) return null;
      // Use downloadUrl for private blobs (includes auth signature); fall back to url
      const fetchUrl = (blobs[0] as { downloadUrl?: string; url: string }).downloadUrl || blobs[0].url;
      const fetchHeaders: Record<string, string> = {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      };
      const res = await fetch(fetchUrl, { cache: 'no-store', headers: fetchHeaders });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (e) {
      console.error(`[storage] blobGetJson(${key}) error:`, e);
      return null;
    }
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

/** Write a large JSON blob (prod: Vercel Blob, dev: local file). */
export async function blobSetJson(key: string, value: unknown): Promise<void> {
  if (IS_BLOB) {
    const { put, list, del } = await import('@vercel/blob');
    // Remove old blob with this key before uploading new one
    const { blobs } = await list({ prefix: `${key}.json`, limit: 10 });
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url));
    }
    await put(`${key}.json`, JSON.stringify(value), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    } as Parameters<typeof put>[2]);
    return;
  }
  const file = localBlobPath(key);
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

/** Delete a blob (prod: Vercel Blob, dev: local file). */
export async function blobDel(key: string): Promise<void> {
  if (IS_BLOB) {
    const { list, del } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `${key}.json`, limit: 10 });
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url));
    }
    return;
  }
  const file = localBlobPath(key);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/**
 * Upload a binary file to Blob storage (prod: Vercel Blob, dev: local filesystem).
 * Returns the stored URL (prod) or relative path (dev).
 */
export async function blobUploadFile(
  blobPath: string,
  buffer: Buffer,
  contentType = 'application/octet-stream',
  access: 'public' | 'private' = 'private',
): Promise<string> {
  if (IS_BLOB) {
    const { put } = await import('@vercel/blob');
    const result = await put(blobPath, buffer, {
      access,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    } as Parameters<typeof put>[2]);
    return result.url;
  }
  // Fallback: write to /tmp on Vercel (ephemeral) or local filesystem in dev
  const localPath = IS_VERCEL
    ? path.join('/tmp', blobPath.replace(/\//g, '-'))
    : blobPath.startsWith('branding-assets/')
      ? path.join(process.cwd(), 'public', blobPath)
      : path.join(process.cwd(), 'historical-imports', blobPath.replace('historical-imports/', ''));
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  return `/${blobPath}`;
}

/** Delete a file from Blob storage (prod) or filesystem (dev). */
export async function blobDeleteFile(urlOrPath: string): Promise<void> {
  if (IS_BLOB) {
    if (urlOrPath.startsWith('https://')) {
      const { del } = await import('@vercel/blob');
      await del([urlOrPath]);
    }
    return;
  }
  // Local: resolve absolute path
  let localPath: string;
  if (urlOrPath.startsWith('/branding-assets/')) {
    localPath = path.join(process.cwd(), 'public', urlOrPath.replace(/^\//, ''));
  } else if (urlOrPath.startsWith('/historical-imports/')) {
    localPath = path.join(process.cwd(), urlOrPath.replace(/^\//, ''));
  } else {
    return;
  }
  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
}
