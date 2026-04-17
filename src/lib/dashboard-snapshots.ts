import { getPipedriveData, getPipedriveMondeSnapshot, setPipedriveData } from '@/lib/data-store';
import { getGoogleAdsDataForDateRange, getGoogleAdsDataForPeriod } from '@/lib/google-ads-store';
import { getGoogleAdsCredentials } from '@/lib/google-ads-credentials-store';
import { syncGoogleAdsDataSnapshot } from '@/lib/google-ads-sync';
import { buildPipedriveDashboardStore } from '@/lib/pipedrive-dashboard-store';
import { getPipedriveDirectCredentials, getPipedriveDirectData } from '@/lib/pipedrive-direct-store';
import { syncPipedriveDirectSnapshot } from '@/lib/pipedrive-direct-sync';

export async function loadGoogleAdsDashboardData(
  start: string,
  end: string,
  periodDays: number,
) {
  let googleAdsData = await getGoogleAdsDataForDateRange(start, end)
    || await getGoogleAdsDataForPeriod(periodDays);

  if (googleAdsData) {
    return googleAdsData;
  }

  const credentials = await getGoogleAdsCredentials();
  if (!credentials) {
    return null;
  }

  try {
    await syncGoogleAdsDataSnapshot();
    googleAdsData = await getGoogleAdsDataForDateRange(start, end)
      || await getGoogleAdsDataForPeriod(periodDays);
  } catch (error) {
    console.error('[dashboard-snapshots] Google Ads bootstrap failed:', error);
  }

  return googleAdsData;
}

export async function loadPipedriveDashboardData() {
  let pipedriveData = await getPipedriveData();
  const mondeSnapshot = await getPipedriveMondeSnapshot();

  if (pipedriveData && ((pipedriveData.mondeDeals?.length ?? 0) > 0 || !mondeSnapshot?.mondeDeals?.length)) {
    return pipedriveData;
  }

  const directData = await getPipedriveDirectData();
  if (directData || mondeSnapshot) {
    pipedriveData = buildPipedriveDashboardStore({
      updatedAt: directData?.updatedAt || mondeSnapshot?.updatedAt || new Date().toISOString(),
      mondeDeals: mondeSnapshot?.mondeDeals ?? [],
      pipelineDeals: mondeSnapshot?.pipelineDeals ?? [],
      directData,
      fallbackPeriod: mondeSnapshot?.period ?? null,
    });
    await setPipedriveData(pipedriveData);
    return pipedriveData;
  }

  const credentials = await getPipedriveDirectCredentials();
  if (!credentials) {
    return null;
  }

  try {
    await syncPipedriveDirectSnapshot();
    pipedriveData = await getPipedriveData();
  } catch (error) {
    console.error('[dashboard-snapshots] Pipedrive bootstrap failed:', error);
  }

  return pipedriveData;
}
