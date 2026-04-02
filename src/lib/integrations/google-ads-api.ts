/**
 * Stub compilavel para a futura integração GRPC com Google Ads.
 *
 * Mantém a API interna estável enquanto o projeto ainda opera com importação manual.
 */

export interface GoogleAdsRuntimeClient {
  developerToken: string;
  customerId: string;
  configured: boolean;
}

export interface GoogleAdsCampaignData {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  startDate: string;
  endDate: string;
}

export function initGoogleAdsClient(): GoogleAdsRuntimeClient {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || '';

  return {
    developerToken,
    customerId,
    configured: Boolean(developerToken && customerId),
  };
}

export async function fetchCampaignsData(
  _customerId: string,
  _startDate: string,
  _endDate: string
): Promise<GoogleAdsCampaignData[]> {
  // A integração real ainda não foi ativada neste MVP.
  return [];
}

export function groupByMonth(
  campaigns: GoogleAdsCampaignData[]
): Map<string, {
  month: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  campaigns: GoogleAdsCampaignData[];
}> {
  const monthMap = new Map<string, {
    month: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    campaigns: GoogleAdsCampaignData[];
  }>();

  for (const campaign of campaigns) {
    const yearMonth = campaign.startDate.substring(0, 7);
    const existing = monthMap.get(yearMonth) || {
      month: yearMonth,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      campaigns: [],
    };

    monthMap.set(yearMonth, {
      ...existing,
      spend: existing.spend + campaign.spend,
      impressions: existing.impressions + campaign.impressions,
      clicks: existing.clicks + campaign.clicks,
      conversions: existing.conversions + campaign.conversions,
      campaigns: [...existing.campaigns, campaign],
    });
  }

  return monthMap;
}
