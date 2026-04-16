import { NextResponse } from 'next/server';
import { syncPipedriveDirectSnapshot } from '@/lib/pipedrive-direct-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    console.log('[pipedrive-direct/sync] Starting sync...');
    console.log('[pipedrive-direct/sync] Fetching data from Pipedrive...');
    const result = await syncPipedriveDirectSnapshot();
    console.log('[pipedrive-direct/sync] Fetched:', result.totalDeals, 'deals');

    console.log('[pipedrive-direct/sync] Sync completed successfully');
    return NextResponse.json({
      message: 'Pipedrive sincronizado com sucesso',
      updatedAt: result.data.updatedAt,
      totalDeals: result.totalDeals,
      totalWon: result.totalWon,
      totalOpen: result.totalOpen,
      totalLost: result.totalLost,
    });
  } catch (error) {
    console.error('[pipedrive-direct/sync] Sync failed:', error);
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar dados do Pipedrive';
    const status = /Configure a conexao/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
