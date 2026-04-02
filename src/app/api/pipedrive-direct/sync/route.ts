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
    const credentials = getPipedriveDirectCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Configure a conexao com o Pipedrive primeiro' }, { status: 400 });
    }

    const data = await syncPipedriveDirectData(credentials);
    setPipedriveDirectData(data);

    const dashboardStore = getPipedriveData();
    if (dashboardStore?.mondeDeals?.length) {
      setPipedriveData(buildPipedriveDashboardStore({
        updatedAt: data.updatedAt,
        mondeDeals: dashboardStore.mondeDeals,
        pipelineDeals: dashboardStore.pipelineDeals ?? [],
        directData: data,
        fallbackPeriod: dashboardStore.period,
      }));
    }

    return NextResponse.json({
      message: 'Pipedrive sincronizado com sucesso',
      updatedAt: data.updatedAt,
      totalDeals: data.totalDeals,
      totalWon: data.totalWon,
      totalOpen: data.totalOpen,
      totalLost: data.totalLost,
    });
  } catch (error) {
    console.error('Pipedrive direct sync error:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar dados do Pipedrive' }, { status: 500 });
  }
}
