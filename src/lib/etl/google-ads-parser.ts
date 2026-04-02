/**
 * Parser para dados do Google Ads
 *
 * Converte dados da API Google Ads em estrutura padronizada
 */

export interface GoogleAdsCampaign {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GoogleAdsMonth {
  month: string;
  year: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GoogleAdsSummary {
  updatedAt: string;
  customerId: string;
  accountName: string;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  months: GoogleAdsMonth[];
  campaigns: GoogleAdsCampaign[];
}

const MONTH_NAMES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Valida estrutura dos dados do Google Ads
 */
export function validateGoogleAdsData(data: any): GoogleAdsSummary | null {
  try {
    if (!data || typeof data !== 'object') return null;

    // Validar campos obrigatórios
    if (!data.updatedAt || !data.customerId || !Array.isArray(data.months)) {
      console.warn('Dados do Google Ads incompletos');
      return null;
    }

    // Validar estrutura de meses
    const validMonths = (data.months || []).filter((m: any) => {
      return (
        m.month &&
        typeof m.year === 'number' &&
        typeof m.spend === 'number' &&
        m.spend >= 0
      );
    });

    if (validMonths.length === 0) return null;

    return {
      updatedAt: data.updatedAt,
      customerId: data.customerId,
      accountName: data.accountName || 'Google Ads',
      totalSpend: data.totalSpend || 0,
      totalImpressions: data.totalImpressions || 0,
      totalClicks: data.totalClicks || 0,
      totalConversions: data.totalConversions || 0,
      months: validMonths,
      campaigns: (data.campaigns || []).filter((c: any) => c.campaignId && c.spend >= 0),
    };
  } catch (error) {
    console.error('Erro ao validar dados do Google Ads:', error);
    return null;
  }
}

/**
 * Calcula CPM (Custo por Mil Impressões)
 */
export function calculateCPM(spend: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (spend / impressions) * 1000;
}

/**
 * Calcula CPC (Custo por Clique)
 */
export function calculateCPC(spend: number, clicks: number): number {
  if (clicks === 0) return 0;
  return spend / clicks;
}

/**
 * Calcula taxa de clique (CTR)
 */
export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

/**
 * Calcula taxa de conversão
 */
export function calculateConversionRate(conversions: number, clicks: number): number {
  if (clicks === 0) return 0;
  return (conversions / clicks) * 100;
}

/**
 * Agrupa dados por mês e calcula métricas
 */
export function aggregateByMonth(data: GoogleAdsSummary) {
  const monthMap = new Map<string, GoogleAdsMonth>();

  for (const month of data.months) {
    const key = `${month.year}-${month.month}`;
    monthMap.set(key, month);
  }

  return Array.from(monthMap.values()).sort((a, b) => {
    const yearDiff = a.year - b.year;
    if (yearDiff !== 0) return yearDiff;

    const aNum = MONTH_NAMES[a.month.toLowerCase()] ?? 99;
    const bNum = MONTH_NAMES[b.month.toLowerCase()] ?? 99;
    return aNum - bNum;
  });
}

/**
 * Agrupa dados por campanha
 */
export function aggregateByCampaign(data: GoogleAdsSummary) {
  const campaignMap = new Map<string, GoogleAdsCampaign>();

  for (const campaign of data.campaigns) {
    const existing = campaignMap.get(campaign.campaignId) || {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };

    campaignMap.set(campaign.campaignId, {
      ...existing,
      spend: existing.spend + campaign.spend,
      impressions: existing.impressions + campaign.impressions,
      clicks: existing.clicks + campaign.clicks,
      conversions: existing.conversions + campaign.conversions,
    });
  }

  return Array.from(campaignMap.values()).sort((a, b) => b.spend - a.spend);
}
