import crypto from 'crypto';
import { blobDeleteFile, blobUploadFile, kvGet, kvSet } from '@/lib/storage';

export type HistoricalImportSource = 'sdr' | 'pipedrive_monde' | 'google_ads' | 'meta_ads';

export interface HistoricalImportBatch {
  id: string;
  source: HistoricalImportSource;
  referenceYear: number;
  periodStart: string;
  periodEnd: string;
  batchLabel: string;
  notes: string | null;
  originalFileName: string;
  storedFileName: string;
  storedRelativePath: string;  // URL (prod) or relative path (dev)
  fileSize: number;
  uploadedAt: string;
  status: 'uploaded';
}

interface HistoricalImportsStore {
  batches: HistoricalImportBatch[];
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.\-() ]+/g, '_').trim() || 'arquivo';
}

async function readStore(): Promise<HistoricalImportsStore> {
  const store = await kvGet<HistoricalImportsStore>('historical-imports');
  return store ?? { batches: [] };
}

async function writeStore(store: HistoricalImportsStore): Promise<void> {
  await kvSet('historical-imports', store);
}

export async function listHistoricalImportBatches(): Promise<HistoricalImportBatch[]> {
  const store = await readStore();
  return store.batches.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function saveHistoricalImportBatch(input: {
  source: HistoricalImportSource;
  referenceYear: number;
  periodStart: string;
  periodEnd: string;
  batchLabel: string;
  notes?: string | null;
  fileName: string;
  fileBuffer: Buffer;
}): Promise<HistoricalImportBatch> {
  const batchId = crypto.randomUUID();
  const safeFileName = sanitizeFileName(input.fileName);
  const storedFileName = `${new Date().toISOString().replace(/[:.]/g, '-')}_${safeFileName}`;
  const blobPath = `historical-imports/${input.source}/${input.referenceYear}/${storedFileName}`;

  const storedUrl = await blobUploadFile(blobPath, input.fileBuffer);

  const batch: HistoricalImportBatch = {
    id: batchId,
    source: input.source,
    referenceYear: input.referenceYear,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    batchLabel: input.batchLabel,
    notes: input.notes?.trim() || null,
    originalFileName: input.fileName,
    storedFileName,
    storedRelativePath: storedUrl,
    fileSize: input.fileBuffer.byteLength,
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
  };

  const store = await readStore();
  store.batches.unshift(batch);
  await writeStore(store);

  return batch;
}

export async function deleteHistoricalImportBatch(
  batchId: string,
): Promise<HistoricalImportBatch | null> {
  const store = await readStore();
  const index = store.batches.findIndex((b) => b.id === batchId);
  if (index < 0) return null;

  const [removedBatch] = store.batches.splice(index, 1);

  // Delete the stored file (works for both Blob URLs and local paths)
  try {
    await blobDeleteFile(removedBatch.storedRelativePath);
  } catch (error) {
    console.error('Error deleting historical import file:', error);
  }

  await writeStore(store);
  return removedBatch;
}
