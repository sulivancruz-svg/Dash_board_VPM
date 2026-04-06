import { NextRequest, NextResponse } from 'next/server';
import { setSourceControls } from '@/lib/source-controls';
import { getGoogleAdsDataForDateRange, getGoogleAdsDataForPeriod, setGoogleAdsStoredData, GoogleAdsStoredData } from '@/lib/google-ads-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type GoogleAdsData = GoogleAdsStoredData;

/**
 * POST /api/imports/google-ads
 *
 * Importa dados do Google Ads API e armazena localmente
 *
 * Requer JSON com estrutura:
 * {
 *   "customerId": "169-854-9372",
 *   "accountName": "Vai Pro Mundo",
 *   "months": [
 *     {
 *       "month": "janeiro",
 *       "year": 2026,
 *       "spend": 5000.00,
 *       "impressions": 50000,
 *       "clicks": 1200,
 *       "conversions": 45
 *     }
 *   ],
 *   "campaigns": [...]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      customerId = '169-854-9372',
      accountName = 'Vai Pro Mundo',
      months = [],
      campaigns = [],
    } = body;

    // Validar estrutura básica
    if (!Array.isArray(months) || months.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado de mês fornecido' },
        { status: 400 }
      );
    }

    // Validar campos obrigatórios em cada mês
    const invalidMonths = months.filter(
      (m: any) =>
        !m.month || !m.year || typeof m.spend !== 'number'
    );

    if (invalidMonths.length > 0) {
      return NextResponse.json(
        { error: 'Alguns meses têm dados inválidos', count: invalidMonths.length },
        { status: 400 }
      );
    }

    // Calcular totalizações
    const totalSpend = months.reduce((sum: number, m: any) => sum + (m.spend || 0), 0);
    const totalImpressions = months.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0);
    const totalClicks = months.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);
    const totalConversions = months.reduce((sum: number, m: any) => sum + (m.conversions || 0), 0);

    // Normalizar dados de campanhas
    const normalizedCampaigns = (campaigns || []).map((c: any) => ({
      campaignId: String(c.campaignId || ''),
      campaignName: String(c.campaignName || 'Sem nome'),
      channelType: String(c.channelType || 'UNKNOWN'),
      channelSubType: c.channelSubType ? String(c.channelSubType) : null,
      spend: Number(c.spend) || 0,
      impressions: Number(c.impressions) || 0,
      clicks: Number(c.clicks) || 0,
      conversions: Number(c.conversions) || 0,
    }));

    // Preparar dados finais
    const googleAdsData: GoogleAdsData = {
      updatedAt: new Date().toISOString(),
      customerId,
      accountName,
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      months: months.map((m: any) => ({
        month: String(m.month).toLowerCase(),
        year: Number(m.year),
        spend: Number(m.spend),
        impressions: Number(m.impressions) || 0,
        clicks: Number(m.clicks) || 0,
        conversions: Number(m.conversions) || 0,
      })),
      campaigns: normalizedCampaigns,
    };

    // Salvar no store
    await setGoogleAdsStoredData(googleAdsData);
    await setSourceControls({ googleAdsEnabled: true });

    return NextResponse.json({
      message: 'Dados do Google Ads importados com sucesso',
      accountName,
      monthsCount: months.length,
      campaignsCount: normalizedCampaigns.length,
      totalSpend: totalSpend.toFixed(2),
      totalClicks,
      totalImpressions,
    });
  } catch (error) {
    console.error('Erro ao importar Google Ads:', error);
    return NextResponse.json(
      { error: 'Erro ao processar dados do Google Ads' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/imports/google-ads
 *
 * Retorna dados do Google Ads salvos localmente
 */
export async function GET(req: NextRequest) {
  try {
    const start = req.nextUrl.searchParams.get('start');
    const end = req.nextUrl.searchParams.get('end');
    const periodParam = req.nextUrl.searchParams.get('period');
    const periodDays = periodParam ? Number.parseInt(periodParam, 10) : null;
    const googleAdsData = start && end
      ? await getGoogleAdsDataForDateRange(start, end)
      : await getGoogleAdsDataForPeriod(periodDays);

    if (!googleAdsData) {
      return NextResponse.json(
        { error: 'Dados do Google Ads nao encontrados' },
        { status: 404 }
      );
    }

    return NextResponse.json(googleAdsData);
  } catch (error) {
    console.error('Erro ao ler dados do Google Ads:', error);
    return NextResponse.json(
      { error: 'Erro ao ler dados do Google Ads' },
      { status: 500 }
    );
  }
}
