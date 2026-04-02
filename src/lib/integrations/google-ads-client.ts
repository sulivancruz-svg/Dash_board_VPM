/**
 * Stub local para a futura integração com Google Ads.
 *
 * O projeto ainda não instala as bibliotecas oficiais, então esta camada
 * expõe o contrato esperado sem depender de pacotes externos.
 */

export interface GoogleAdsOAuthClient {
  clientId: string;
  redirectUri: string;
  hasRefreshToken: boolean;
}

export function getGoogleAdsClient(): GoogleAdsOAuthClient {
  return {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || 'not-configured',
    redirectUri: process.env.GOOGLE_ADS_REDIRECT_URI || 'http://localhost:3000/api/auth/google-callback',
    hasRefreshToken: Boolean(process.env.GOOGLE_ADS_REFRESH_TOKEN),
  };
}

export interface GoogleAdsCampaignMetrics {
  campaignName: string;
  campaignId: string;
  startDate: string;
  endDate: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GoogleAdsPeriodData {
  month: string;
  year: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  campaigns: GoogleAdsCampaignMetrics[];
}

export async function fetchGoogleAdsData(
  _customerId: string,
  _startDate: string,
  _endDate: string
): Promise<GoogleAdsPeriodData[]> {
  // O MVP atual usa importacao manual/local. A chamada real fica para a fase de API.
  return [];
}

export const CAMPAIGNS_METRICS_QUERY = `
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    segments.date,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions
  FROM campaign
  WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    AND campaign.status = 'ENABLED'
  ORDER BY segments.date
`;
