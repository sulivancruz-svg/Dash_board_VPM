import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
  storedRelativePath: string;
  fileSize: number;
  uploadedAt: string;
  status: 'uploaded';
}

interface HistoricalImportsStore {
  batches: HistoricalImportBatch[];
}

const STORE_FILE = path.join(process.cwd(), '.historical-imports.json');
const FILES_DIR = path.join(process.cwd(), 'historical-imports');

function ensureStorage(): void {
  if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ batches: [] }, null, 2), 'utf-8');
  }
}

function readStore(): HistoricalImportsStore {
  ensureStorage();

  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')) as HistoricalImportsStore;
  } catch {
    return { batches: [] };
  }
}

function writeStore(store: HistoricalImportsStore): void {
  ensureStorage();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.\-() ]+/g, '_').trim() || 'arquivo';
}

export function listHistoricalImportBatches(): HistoricalImportBatch[] {
  const store = readStore();
  return store.batches.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function saveHistoricalImportBatch(input: {
  source: HistoricalImportSource;
  referenceYear: number;
  periodStart: string;
  periodEnd: string;
  batchLabel: string;
  notes?: string | null;
  fileName: string;
  fileBuffer: Buffer;
}): HistoricalImportBatch {
  ensureStorage();

  const batchId = crypto.randomUUID();
  const safeFileName = sanitizeFileName(input.fileName);
  const sourceDir = path.join(FILES_DIR, input.source, String(input.referenceYear));
  fs.mkdirSync(sourceDir, { recursive: true });

  const storedFileName = `${new Date().toISOString().replace(/[:.]/g, '-')}_${safeFileName}`;
  const absoluteFilePath = path.join(sourceDir, storedFileName);
  fs.writeFileSync(absoluteFilePath, input.fileBuffer);

  const relativePath = path.relative(process.cwd(), absoluteFilePath).replace(/\\/g, '/');
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
    storedRelativePath: relativePath,
    fileSize: input.fileBuffer.byteLength,
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
  };

  const store = readStore();
  store.batches.unshift(batch);
  writeStore(store);

  return batch;
}

export function deleteHistoricalImportBatch(batchId: string): HistoricalImportBatch | null {
  const store = readStore();
  const index = store.batches.findIndex((batch) => batch.id === batchId);

  if (index < 0) {
    return null;
  }

  const [removedBatch] = store.batches.splice(index, 1);
  const absoluteFilePath = path.join(process.cwd(), removedBatch.storedRelativePath);

  try {
    if (fs.existsSync(absoluteFilePath)) {
      fs.unlinkSync(absoluteFilePath);
    }

    removeEmptyParentDirs(path.dirname(absoluteFilePath), FILES_DIR);
  } catch (error) {
    console.error('Error deleting historical import file:', error);
  }

  writeStore(store);
  return removedBatch;
}

function removeEmptyParentDirs(currentDir: string, stopDir: string): void {
  let dir = currentDir;
  const normalizedStopDir = path.resolve(stopDir);

  while (path.resolve(dir).startsWith(normalizedStopDir) && path.resolve(dir) !== normalizedStopDir) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
        continue;
      }
    } catch {
      return;
    }

    return;
  }
}
