import { getPipedriveData, getPipedriveMondeSnapshot, setPipedriveData } from '@/lib/data-store';
import { syncPipedriveDirectData } from '@/lib/integrations/pipedrive-direct';
import { buildPipedriveDashboardStore } from '@/lib/pipedrive-dashboard-store';
import {
  getPipedriveDirectCredentials,
  PipedriveDirectData,
  setPipedriveDirectData,
} from '@/lib/pipedrive-direct-store';

export interface PipedriveDirectSyncResult {
  data: PipedriveDirectData;
  dashboardUpdatedAt: string;
  totalDeals: number;
  totalWon: number;
  totalOpen: number;
  totalLost: number;
}

export async function syncPipedriveDirectSnapshot(): Promise<PipedriveDirectSyncResult> {
  const credentials = await getPipedriveDirectCredentials();
  if (!credentials) {
    throw new Error('Configure a conexao com o Pipedrive primeiro');
  }

  const data = await syncPipedriveDirectData(credentials);
  await setPipedriveDirectData(data);

  const currentDashboardStore = await getPipedriveData();
  const mondeSnapshot = await getPipedriveMondeSnapshot();
  const dashboardStore = buildPipedriveDashboardStore({
    updatedAt: data.updatedAt,
    mondeDeals: currentDashboardStore?.mondeDeals ?? mondeSnapshot?.mondeDeals ?? [],
    pipelineDeals: currentDashboardStore?.pipelineDeals ?? mondeSnapshot?.pipelineDeals ?? [],
    directData: data,
    fallbackPeriod: currentDashboardStore?.period ?? mondeSnapshot?.period ?? null,
  });
  await setPipedriveData(dashboardStore);

  return {
    data,
    dashboardUpdatedAt: dashboardStore.updatedAt,
    totalDeals: data.totalDeals,
    totalWon: data.totalWon,
    totalOpen: data.totalOpen,
    totalLost: data.totalLost,
  };
}
