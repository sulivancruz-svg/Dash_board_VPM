import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGoogleAdsCredentials } from '@/lib/google-ads-credentials-store';
import { setSourceControls } from '@/lib/source-controls';
import { setGoogleAdsStoredData } from '@/lib/google-ads-store';

const GOOGLE_ADS_API_VERSIONS = ['v23', 'v22', 'v21', 'v20', 'v19', 'v18'] as const;

const MONTH_PT: Record<number, string> = {
  1: 'janeiro',
  2: 'fevereiro',
  3: 'marco',
  4: 'abril',
  5: 'maio',
  6: 'junho',
  7: 'julho',
  8: 'agosto',
  9: 'setembro',
  10: 'outubro',
  11: 'novembro',
  12: 'dezembro',
};

interface GaqlRow {
  campaign?: {
    id: string;
    name: string;
    status: string;
    advertisingChannelType?: string;
    advertisingChannelSubType?: string;
  };
  metrics?: {
    costMicros?: string | number;
    impressions?: string | number;
    clicks?: string | number;
    conversions?: string | number;
  };
  segments?: { month?: string; date?: string };
}

function toBase64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createServiceAccountJWT(email: string, privateKey: string, keyId?: string): string {
  const now = Math.floor(Date.now() / 1000);
  const headerObj: Record<string, string> = { alg: 'RS256', typ: 'JWT' };

  if (keyId) {
    headerObj.kid = keyId;
  }

  const header = toBase64Url(Buffer.from(JSON.stringify(headerObj)));
  const payload = toBase64Url(
    Buffer.from(
      JSON.stringify({
        iss: email,
        scope: 'https://www.googleapis.com/auth/adwords',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    ),
  );

  const sigInput = `${header}.${payload}`;
  const normalizedKey = privateKey.replace(/\\n/g, '\n');

  let keyObj: crypto.KeyObject;
  try {
    keyObj = crypto.createPrivateKey({ key: normalizedKey, format: 'pem', type: 'pkcs8' });
  } catch {
    keyObj = crypto.createPrivateKey({ key: normalizedKey, format: 'pem' });
  }

  const sigBuffer = crypto.sign('SHA256', Buffer.from(sigInput), keyObj);
  return `${sigInput}.${toBase64Url(sigBuffer)}`;
}

async function getAccessToken(email: string, privateKey: string, keyId?: string): Promise<string> {
  const jwt = createServiceAccountJWT(email, privateKey, keyId);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();

  if (!data.access_token) {
    const detail = data.error_description || data.error || JSON.stringify(data);
    const extra = data.error && data.error_description ? ` [${data.error}]` : '';
    throw new Error(`Falha ao obter access token: ${detail}${extra}`);
  }

  return data.access_token;
}

function getErrorMessage(payload: any, rawBody: string, status: number): string {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (payload?.error?.details?.[0]?.message) {
    return payload.error.details[0].message;
  }

  const trimmedBody = rawBody.trim();
  if (trimmedBody) {
    return trimmedBody.slice(0, 300);
  }

  return `HTTP ${status}`;
}

async function runGaqlQuery(
  accessToken: string,
  developerToken: string,
  customerId: string,
  managerCustomerId: string | undefined,
  query: string,
): Promise<{ rows: GaqlRow[]; apiVersion: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  if (managerCustomerId) {
    headers['login-customer-id'] = managerCustomerId;
  }

  const versionErrors: string[] = [];

  for (const apiVersion of GOOGLE_ADS_API_VERSIONS) {
    const url = `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`;
    const allRows: GaqlRow[] = [];
    let nextPageToken: string | undefined;
    let versionUnavailable = false;

    do {
      const body: Record<string, unknown> = { query };
      if (nextPageToken) {
        body.pageToken = nextPageToken;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const rawBody = await res.text();
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') && rawBody ? JSON.parse(rawBody) : null;

      if (!res.ok) {
        const message = getErrorMessage(payload, rawBody, res.status);

        if (res.status === 404) {
          versionErrors.push(`${apiVersion}: ${message}`);
          versionUnavailable = true;
          nextPageToken = undefined;
          break;
        }

        throw new Error(`Google Ads API (${apiVersion}): ${message}`);
      }

      if (!payload) {
        throw new Error(`Google Ads API (${apiVersion}) retornou um corpo invalido`);
      }

      if (Array.isArray(payload.results)) {
        allRows.push(...payload.results);
      }

      nextPageToken = payload.nextPageToken;
    } while (nextPageToken);

    if (!versionUnavailable) {
      return { rows: allRows, apiVersion };
    }
  }

  throw new Error(
    `Nenhuma versao da Google Ads API respondeu. Tentativas: ${versionErrors.join(' | ')}`,
  );
}

export async function POST() {
  try {
    const creds = await getGoogleAdsCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Conta de servico nao configurada. Configure as credenciais primeiro.' },
        { status: 400 },
      );
    }

    const {
      serviceAccountEmail,
      privateKey,
      privateKeyId,
      developerToken,
      customerId,
      managerCustomerId,
    } = creds;

    if (!privateKey || !developerToken || !customerId || !serviceAccountEmail) {
      return NextResponse.json({ error: 'Credenciais incompletas no arquivo salvo' }, { status: 400 });
    }

    const accessToken = await getAccessToken(serviceAccountEmail, privateKey, privateKeyId);

    const today = new Date().toISOString().split('T')[0];
    const startDate = '2025-01-01';
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.advertising_channel_sub_type,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${today}'
        AND metrics.cost_micros > 0
      ORDER BY segments.date, campaign.name
    `;

    const { rows, apiVersion } = await runGaqlQuery(
      accessToken,
      developerToken,
      customerId,
      managerCustomerId,
      query,
    );

    const monthMap = new Map<
      string,
      {
        year: number;
        month: string;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
      }
    >();

    const campaignMap = new Map<
      string,
      {
        campaignId: string;
        campaignName: string;
        channelType: string;
        channelSubType: string | null;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
      }
    >();
    const dailyMap = new Map<
      string,
      {
        date: string;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
      }
    >();
    const dailyCampaignMap = new Map<
      string,
      {
        date: string;
        campaignId: string;
        campaignName: string;
        channelType: string;
        channelSubType: string | null;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
      }
    >();

    for (const row of rows) {
      const spend = Number(row.metrics?.costMicros || 0) / 1_000_000;
      const impressions = Number(row.metrics?.impressions || 0);
      const clicks = Number(row.metrics?.clicks || 0);
      const conversions = Number(row.metrics?.conversions || 0);
      const date = row.segments?.date;

      if (!date) {
        continue;
      }

      const [yearStr, monthStr] = date.split('-');
      const year = Number.parseInt(yearStr, 10);
      const monthNum = Number.parseInt(monthStr, 10);
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthName = MONTH_PT[monthNum] || `mes-${monthNum}`;

      const monthEntry = monthMap.get(monthKey) || {
        year,
        month: monthName,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      };

      monthMap.set(monthKey, {
        ...monthEntry,
        spend: monthEntry.spend + spend,
        impressions: monthEntry.impressions + impressions,
        clicks: monthEntry.clicks + clicks,
        conversions: monthEntry.conversions + conversions,
      });

      const campaignId = String(row.campaign?.id || 'unknown');
      const campaignName = row.campaign?.name || 'Sem nome';
      const channelType = row.campaign?.advertisingChannelType || 'UNKNOWN';
      const channelSubType = row.campaign?.advertisingChannelSubType || null;
      const campaignEntry = campaignMap.get(campaignId) || {
        campaignId,
        campaignName,
        channelType,
        channelSubType,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      };

      campaignMap.set(campaignId, {
        ...campaignEntry,
        channelType,
        channelSubType,
        spend: campaignEntry.spend + spend,
        impressions: campaignEntry.impressions + impressions,
        clicks: campaignEntry.clicks + clicks,
        conversions: campaignEntry.conversions + conversions,
      });

      const dailyEntry = dailyMap.get(date) || {
        date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      };

      dailyMap.set(date, {
        ...dailyEntry,
        spend: dailyEntry.spend + spend,
        impressions: dailyEntry.impressions + impressions,
        clicks: dailyEntry.clicks + clicks,
        conversions: dailyEntry.conversions + conversions,
      });

      const dailyCampaignKey = `${date}:${campaignId}`;
      const dailyCampaignEntry = dailyCampaignMap.get(dailyCampaignKey) || {
        date,
        campaignId,
        campaignName,
        channelType,
        channelSubType,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      };

      dailyCampaignMap.set(dailyCampaignKey, {
        ...dailyCampaignEntry,
        channelType,
        channelSubType,
        spend: dailyCampaignEntry.spend + spend,
        impressions: dailyCampaignEntry.impressions + impressions,
        clicks: dailyCampaignEntry.clicks + clicks,
        conversions: dailyCampaignEntry.conversions + conversions,
      });
    }

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({ ...value, spend: Math.round(value.spend * 100) / 100 }));

    const campaigns = Array.from(campaignMap.values())
      .sort((a, b) => b.spend - a.spend)
      .map((campaign) => ({ ...campaign, spend: Math.round(campaign.spend * 100) / 100 }));

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({ ...value, spend: Math.round(value.spend * 100) / 100 }));

    const dailyCampaigns = Array.from(dailyCampaignMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({ ...value, spend: Math.round(value.spend * 100) / 100 }));

    const totalSpend = months.reduce((sum, month) => sum + month.spend, 0);
    const totalImpressions = months.reduce((sum, month) => sum + month.impressions, 0);
    const totalClicks = months.reduce((sum, month) => sum + month.clicks, 0);
    const totalConversions = months.reduce((sum, month) => sum + month.conversions, 0);

    const googleAdsData = {
      updatedAt: new Date().toISOString(),
      source: 'api',
      apiVersion,
      customerId,
      accountName: 'Vai Pro Mundo',
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalImpressions,
      totalClicks,
      totalConversions,
      months,
      campaigns,
      daily,
      dailyCampaigns,
    };

    await setGoogleAdsStoredData(googleAdsData);
    await setSourceControls({ googleAdsEnabled: true });

    return NextResponse.json({
      success: true,
      message: `Google Ads sincronizado via ${apiVersion}: ${months.length} mes(es), ${campaigns.length} campanha(s)`,
      apiVersion,
      rowsProcessed: rows.length,
      monthsCount: months.length,
      campaignsCount: campaigns.length,
      totalSpend: totalSpend.toFixed(2),
      totalClicks,
      totalImpressions,
      totalConversions,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar Google Ads:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar Google Ads' },
      { status: 500 },
    );
  }
}

export async function GET() {
  const creds = await getGoogleAdsCredentials();
  return NextResponse.json({ configured: !!creds });
}
