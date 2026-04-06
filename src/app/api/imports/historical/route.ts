import { NextRequest, NextResponse } from 'next/server';
import {
  HistoricalImportSource,
  deleteHistoricalImportBatch,
  listHistoricalImportBatches,
  saveHistoricalImportBatch,
} from '@/lib/historical-imports-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_SOURCES = new Set<HistoricalImportSource>([
  'sdr',
  'pipedrive_monde',
  'google_ads',
  'meta_ads',
]);

function isIsoDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET() {
  try {
    return NextResponse.json({
      batches: await listHistoricalImportBatches(),
    });
  } catch (error) {
    console.error('Historical imports GET error:', error);
    return NextResponse.json({ error: 'Erro ao listar uploads historicos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const source = String(formData.get('source') || '') as HistoricalImportSource;
    const referenceYear = Number.parseInt(String(formData.get('referenceYear') || ''), 10);
    const periodStart = String(formData.get('periodStart') || '');
    const periodEnd = String(formData.get('periodEnd') || '');
    const batchLabel = String(formData.get('batchLabel') || '').trim();
    const notes = String(formData.get('notes') || '').trim();
    const file = formData.get('file');

    if (!VALID_SOURCES.has(source)) {
      return NextResponse.json({ error: 'Fonte historica invalida' }, { status: 400 });
    }

    if (!Number.isInteger(referenceYear) || referenceYear < 2000 || referenceYear > 2100) {
      return NextResponse.json({ error: 'Ano de referencia invalido' }, { status: 400 });
    }

    if (!isIsoDate(periodStart) || !isIsoDate(periodEnd) || periodStart > periodEnd) {
      return NextResponse.json({ error: 'Periodo invalido' }, { status: 400 });
    }

    if (!batchLabel) {
      return NextResponse.json({ error: 'Nome do lote e obrigatorio' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const batch = await saveHistoricalImportBatch({
      source,
      referenceYear,
      periodStart,
      periodEnd,
      batchLabel,
      notes,
      fileName: file.name,
      fileBuffer,
    });

    return NextResponse.json({
      message: 'Upload historico salvo com sucesso',
      batch,
    });
  } catch (error) {
    console.error('Historical imports POST error:', error);
    return NextResponse.json({ error: 'Erro ao salvar upload historico' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const batchId = req.nextUrl.searchParams.get('id');

    if (!batchId) {
      return NextResponse.json({ error: 'ID do lote e obrigatorio' }, { status: 400 });
    }

    const deletedBatch = await deleteHistoricalImportBatch(batchId);
    if (!deletedBatch) {
      return NextResponse.json({ error: 'Lote nao encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Lote historico removido com sucesso',
      batch: deletedBatch,
    });
  } catch (error) {
    console.error('Historical imports DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao excluir lote historico' }, { status: 500 });
  }
}
