import { NextResponse } from 'next/server';
import { getPipedriveData, setPipedriveData } from '@/lib/data-store';
import { syncPipedriveDirectData } from '@/lib/integrations/pipedrive-direct';
import { buildPipedriveDashboardStore } from '@/lib/pipedrive-dashboard-store';
import {
  getPipedriveDirectCredentials,
  setPipedriveDirectData,
} from '@/lib/pipedrive-direct-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    console.log('[pipedrive-direct/sync] Starting sync...');
    const credentials = await getPipedriveDirectCredentials();
    if (!credentials) {
      console.log('[pipedrive-direct/sync] No credentials found');
      return NextResponse.json({ error: 'Configure a conexao com o Pipedrive primeiro' }, { status: 400 });
    }

    console.log('[pipedrive-direct/sync] Fetching data from Pipedrive...');
    const data = await syncPipedriveDirectData(credentials);
    console.log('[pipedrive-direct/sync] Fetched:', data.totalDeals, 'deals');

    console.log('[pipedrive-direct/sync] Saving to blob storage...');
    await setPipedriveDirectData(data);

    const dashboardStore = await getPipedriveData();
    if (dashboardStore?.mondeDeals?.length) {
      console.log('[pipedrive-direct/sync] Updating dashboard store with', dashboardStore.mondeDeals.length, 'monde deals');
      await setPipedriveData(buildPipedriveDashboardStore({
        updatedAt: data.updatedAt,
        mondeDeals: dashboardStore.mondeDeals,
        pipelineDeals: dashboardStore.pipelineDeals ?? [],
        directData: data,
        fallbackPeriod: dashboardStore.period,
      }));
    }

    console.log('[pipedrive-direct/sync] Sync completed successfully');
    return NextResponse.json({
      message: 'Pipedrive sincronizado com sucesso',
      updatedAt: data.updatedAt,
      totalDeals: data.totalDeals,
      totalWon: data.totalWon,
      totalOpen: data.totalOpen,
      totalLost: data.totalLost,
    });
  } catch (error) {
    console.error('[pipedrive-direct/sync] Sync failed:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar dados do Pipedrive' }, { status: 500 });
  }
}
