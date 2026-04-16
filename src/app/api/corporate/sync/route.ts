import { NextRequest, NextResponse } from 'next/server';
import { fetchCorporateSalesFromSheet } from '@/lib/corporate-sheets';
import {
  setCorporateSalesData,
  appendCorporateSalesSnapshot,
  buildSnapshot,
} from '@/lib/corporate-sales-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Sync corporate sales data from the public Google Sheet.
 * Triggered manually (POST from UI) or via Vercel Cron (daily).
 */
export async function POST(req: NextRequest) {
  const start = Date.now();

  // Se CRON_SECRET estiver configurado, exige header Authorization correto.
  // Em dev local (sem CRON_SECRET) libera para testes manuais.
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const sheetId = req.nextUrl.searchParams.get('sheetId') || undefined;
    const gid = req.nextUrl.searchParams.get('gid') || undefined;

    const data = await fetchCorporateSalesFromSheet(sheetId, gid);
    await setCorporateSalesData(data);

    // Also persist a historical snapshot for trend analysis
    const snapshot = buildSnapshot(data);
    await appendCorporateSalesSnapshot(snapshot);

    return NextResponse.json({
      success: true,
      recordsImported: data.totalRecords,
      updatedAt: data.updatedAt,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    console.error('[corporate/sync] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      },
      { status: 500 },
    );
  }
}

// Allow GET as well so that Vercel Cron (which issues GET) can trigger a sync.
export const GET = POST;
