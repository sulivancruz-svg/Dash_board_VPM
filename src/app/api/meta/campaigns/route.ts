import { NextRequest, NextResponse } from 'next/server';
import { getMetaToken } from '@/lib/meta-token-store';
import { buildPtBrDateLabel, resolveDateRange } from '@/lib/date-range';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MetaLevel = 'campaign' | 'adset' | 'ad';

interface MetaInsightsRow {
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
}

interface MetaCampaignInfo {
  id: string;
  name: string;
  objective?: string;
}

interface MetaCreativeInfo {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  effectiveStatus?: string | null;
  status?: string | null;
}

interface MetaApiResult<T> {
  data: T | null;
  status: number;
  error: string | null;
}

async function fetchMetaInsights(
  accountId: string,
  token: string,
  level: MetaLevel,
  range: { start: string; end: string },
): Promise<MetaApiResult<{ data?: MetaInsightsRow[] }>> {
  const url = new URL(`https://graph.facebook.com/v20.0/${accountId}/insights`);
  url.searchParams.append('access_token', token);
  url.searchParams.append('level', level);
  url.searchParams.append(
    'fields',
    'campaign_name,adset_name,ad_name,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,campaign_id,adset_id,ad_id',
  );
  url.searchParams.append('time_range', JSON.stringify({ since: range.start, until: range.end }));
  url.searchParams.append('limit', '200');

  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok) {
    console.error(`Meta API ${level} error:`, text);
    return {
      data: null,
      status: res.status,
      error: text,
    };
  }

  return {
    data: JSON.parse(text) as { data?: MetaInsightsRow[] },
    status: res.status,
    error: null,
  };
}

async function fetchCampaignObjectives(accountId: string, token: string): Promise<MetaApiResult<Map<string, MetaCampaignInfo>>> {
  const url = new URL(`https://graph.facebook.com/v20.0/${accountId}/campaigns`);
  url.searchParams.append('access_token', token);
  url.searchParams.append('fields', 'id,name,objective');
  url.searchParams.append('limit', '200');

  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok) {
    console.error('Meta campaign objective error:', text);
    return {
      data: new Map(),
      status: res.status,
      error: text,
    };
  }

  const payload = JSON.parse(text) as { data?: MetaCampaignInfo[] };
  return {
    data: new Map((payload.data || []).map((campaign) => [campaign.id, campaign])),
    status: res.status,
    error: null,
  };
}

function extractCreativeInfo(adDetails: any): MetaCreativeInfo {
  const creative = adDetails?.creative;
  const story = creative?.object_story_spec || {};
  const linkData = story.link_data || {};
  const videoData = story.video_data || {};

  return {
    id: creative?.id,
    name: creative?.name,
    title: linkData.name || videoData.title || null,
    body: linkData.message || videoData.message || null,
    imageUrl: creative?.image_url || linkData.image_hash || null,
    thumbnailUrl: creative?.thumbnail_url || null,
    effectiveStatus: adDetails?.effective_status || null,
    status: adDetails?.status || null,
  };
}

async function fetchAdCreativeDetails(adIds: string[], token: string): Promise<Map<string, MetaCreativeInfo>> {
  const details = new Map<string, MetaCreativeInfo>();

  for (let index = 0; index < adIds.length; index += 25) {
    const chunk = adIds.slice(index, index + 25);
    const requests = chunk.map((id) => ({
      method: 'GET',
      relative_url: `${id}?fields=id,name,status,effective_status,creative{id,name,image_url,thumbnail_url,object_story_spec}`,
    }));

    const batchUrl = new URL('https://graph.facebook.com/v20.0/');
    batchUrl.searchParams.append('access_token', token);
    batchUrl.searchParams.append('batch', JSON.stringify(requests));

    const res = await fetch(batchUrl.toString(), { method: 'POST' });
    const text = await res.text();
    if (!res.ok) {
      console.error('Meta ad detail batch error:', text);
      continue;
    }

    const payload = JSON.parse(text) as Array<{ code: number; body?: string }>;
    payload.forEach((item, itemIndex) => {
      if (item.code !== 200 || !item.body) return;
      try {
        const parsed = JSON.parse(item.body);
        const adId = chunk[itemIndex];
        details.set(adId, extractCreativeInfo(parsed));
      } catch {
        return;
      }
    });
  }

  return details;
}

function extractResult(actions: MetaInsightsRow['actions']): number {
  if (!actions || !Array.isArray(actions)) return 0;

  const priorities = [
    'lead',
    'onsite_conversion.lead_grouped',
    'onsite_conversion.messaging_conversation_started_7d',
    'offsite_conversion.fb_pixel_lead',
    'link_click',
  ];

  for (const type of priorities) {
    const action = actions.find((row) => row.action_type === type);
    if (action) return parseInt(action.value || '0', 10);
  }

  return actions.reduce((sum, action) => sum + parseInt(action.value || '0', 10), 0);
}

function extractWhatsAppConversations(actions: MetaInsightsRow['actions']): number {
  if (!actions || !Array.isArray(actions)) return 0;

  const exactMatches = [
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.messaging_first_reply',
    'messaging_conversation_started_7d',
  ];

  for (const type of exactMatches) {
    const action = actions.find((row) => row.action_type === type);
    if (action) return parseInt(action.value || '0', 10);
  }

  const relatedActions = actions.filter((row) => /whatsapp|messaging|conversation/i.test(row.action_type || ''));
  if (relatedActions.length === 0) return 0;

  return relatedActions.reduce((sum, action) => sum + parseInt(action.value || '0', 10), 0);
}

function classifyMetaObjective(
  objectiveRaw: string | undefined,
  campaignName: string,
  adsetName?: string,
): { objectiveRaw: string | null; objectiveLabel: string; strategicObjective: string } {
  const objective = (objectiveRaw || '').toUpperCase();
  const combinedName = `${campaignName} ${adsetName || ''}`.toLowerCase();

  if (/(remarketing|retarget|retargeting|rmkt|reimpacto|reengaj|remarket)/i.test(combinedName)) {
    return {
      objectiveRaw: objective || null,
      objectiveLabel: objective || 'REMARKETING',
      strategicObjective: 'Remarketing',
    };
  }

  if (objective.includes('AWARENESS') || objective.includes('REACH') || objective.includes('BRAND_AWARENESS')) {
    return {
      objectiveRaw: objective || null,
      objectiveLabel: objective || 'AWARENESS',
      strategicObjective: 'Alcance',
    };
  }

  if (objective.includes('TRAFFIC') || objective.includes('LINK_CLICKS') || /(trafego|traffic|site|visita)/i.test(combinedName)) {
    return {
      objectiveRaw: objective || null,
      objectiveLabel: objective || 'TRAFFIC',
      strategicObjective: 'Trafego',
    };
  }

  if (
    objective.includes('LEADS')
    || objective.includes('LEAD_GENERATION')
    || objective.includes('MESSAGES')
    || /(lead|cadastro|capta|whats|mensagem|message)/i.test(combinedName)
  ) {
    return {
      objectiveRaw: objective || null,
      objectiveLabel: objective || 'LEADS',
      strategicObjective: 'Captacao',
    };
  }

  if (objective.includes('ENGAGEMENT') || /(engaja|envolvimento|interacao)/i.test(combinedName)) {
    return {
      objectiveRaw: objective || null,
      objectiveLabel: objective || 'ENGAGEMENT',
      strategicObjective: 'Engajamento',
    };
  }

  if (objective.includes('SALES') || objective.includes('CONVERSIONS') || /(convers|venda)/i.test(combinedName)) {
    return {
      objectiveRaw: objective || null,
      objectiveLabel: objective || 'SALES',
      strategicObjective: 'Conversao',
    };
  }

  return {
    objectiveRaw: objective || null,
    objectiveLabel: objective || 'NAO_CLASSIFICADO',
    strategicObjective: 'Nao classificado',
  };
}

function buildObjectiveBreakdown(rows: Array<{ strategicObjective: string; spend: number; results: number }>) {
  const grouped = new Map<string, { strategicObjective: string; spend: number; results: number; count: number }>();

  for (const row of rows) {
    const entry = grouped.get(row.strategicObjective) || {
      strategicObjective: row.strategicObjective,
      spend: 0,
      results: 0,
      count: 0,
    };

    grouped.set(row.strategicObjective, {
      strategicObjective: row.strategicObjective,
      spend: entry.spend + row.spend,
      results: entry.results + row.results,
      count: entry.count + 1,
    });
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.spend - a.spend)
    .map((item) => ({
      ...item,
      spend: Math.round(item.spend * 100) / 100,
    }));
}

export async function GET(req: NextRequest) {
  try {
    const range = resolveDateRange(
      req.nextUrl.searchParams.get('start'),
      req.nextUrl.searchParams.get('end'),
      Number.parseInt(req.nextUrl.searchParams.get('period') || '30', 10),
    );
    const metaToken = await getMetaToken();

    if (!metaToken?.token) {
      return NextResponse.json(
        { error: 'Meta nao conectada. Configure seu token nas Configuracoes.' },
        { status: 401 },
      );
    }

    const accountId = metaToken.accountId;

    const [campaignResult, adsetResult, adResult, campaignObjectivesResult] = await Promise.all([
      fetchMetaInsights(accountId, metaToken.token, 'campaign', range),
      fetchMetaInsights(accountId, metaToken.token, 'adset', range),
      fetchMetaInsights(accountId, metaToken.token, 'ad', range),
      fetchCampaignObjectives(accountId, metaToken.token),
    ]);

    const results = [campaignResult, adsetResult, adResult, campaignObjectivesResult];
    const fatalError = results.find((result) => result.status === 401 || result.status === 403);
    if (fatalError) {
      return NextResponse.json(
        { error: 'Token Meta invalido, expirado ou sem permissao para a conta selecionada.' },
        { status: fatalError.status },
      );
    }

    const hardFailure = results.find((result) => result.data === null && result.error);
    if (hardFailure && !campaignResult.data && !adsetResult.data && !adResult.data) {
      return NextResponse.json(
        { error: 'Erro ao consultar a Meta API para a conta selecionada.' },
        { status: hardFailure.status || 500 },
      );
    }

    const campaignData = campaignResult.data;
    const adsetData = adsetResult.data;
    const adData = adResult.data;
    const campaignObjectives = campaignObjectivesResult.data || new Map<string, MetaCampaignInfo>();

    const adIds = Array.from(
      new Set((adData?.data || []).map((row) => row.ad_id).filter(Boolean) as string[]),
    );
    const adCreativeDetails = await fetchAdCreativeDetails(adIds, metaToken.token);

    const campaigns = (campaignData?.data || [])
      .map((row) => {
        const spend = parseFloat(row.spend || '0');
        const results = extractResult(row.actions);
        const whatsAppConversations = extractWhatsAppConversations(row.actions);
        const cpr = results > 0 ? spend / results : 0;
        const objectiveInfo = classifyMetaObjective(
          campaignObjectives.get(row.campaign_id || '')?.objective,
          row.campaign_name || 'Sem nome',
        );

        return {
          id: row.campaign_id,
          name: row.campaign_name,
          objectiveRaw: objectiveInfo.objectiveRaw,
          objectiveLabel: objectiveInfo.objectiveLabel,
          strategicObjective: objectiveInfo.strategicObjective,
          spend,
          impressions: parseInt(row.impressions || '0', 10),
          reach: parseInt(row.reach || '0', 10),
          frequency: parseFloat(row.frequency || '0'),
          clicks: parseInt(row.clicks || '0', 10),
          ctr: parseFloat(row.ctr || '0'),
          cpc: parseFloat(row.cpc || '0'),
          cpm: parseFloat(row.cpm || '0'),
          results,
          whatsAppConversations,
          cpr: Math.round(cpr * 100) / 100,
        };
      })
      .sort((a, b) => b.spend - a.spend);

    const adsets = (adsetData?.data || [])
      .map((row) => {
        const spend = parseFloat(row.spend || '0');
        const results = extractResult(row.actions);
        const cpr = results > 0 ? spend / results : 0;
        const objectiveInfo = classifyMetaObjective(
          campaignObjectives.get(row.campaign_id || '')?.objective,
          row.campaign_name || 'Sem nome',
          row.adset_name,
        );

        return {
          id: row.adset_id,
          name: row.adset_name,
          campaignId: row.campaign_id,
          campaignName: row.campaign_name,
          objectiveRaw: objectiveInfo.objectiveRaw,
          objectiveLabel: objectiveInfo.objectiveLabel,
          strategicObjective: objectiveInfo.strategicObjective,
          spend,
          impressions: parseInt(row.impressions || '0', 10),
          reach: parseInt(row.reach || '0', 10),
          clicks: parseInt(row.clicks || '0', 10),
          ctr: parseFloat(row.ctr || '0'),
          cpc: parseFloat(row.cpc || '0'),
          results,
          cpr: Math.round(cpr * 100) / 100,
        };
      })
      .sort((a, b) => b.spend - a.spend);

    const ads = (adData?.data || [])
      .map((row) => {
        const spend = parseFloat(row.spend || '0');
        const results = extractResult(row.actions);
        const cpr = results > 0 ? spend / results : 0;
        const creativeInfo = adCreativeDetails.get(row.ad_id || '') || {};
        const objectiveInfo = classifyMetaObjective(
          campaignObjectives.get(row.campaign_id || '')?.objective,
          row.campaign_name || 'Sem nome',
          row.adset_name,
        );

        return {
          id: row.ad_id,
          name: row.ad_name,
          creativeId: creativeInfo.id || null,
          creativeName: creativeInfo.name || row.ad_name || 'Criativo sem nome',
          creativeTitle: creativeInfo.title || null,
          creativeBody: creativeInfo.body || null,
          creativeImageUrl: creativeInfo.imageUrl || creativeInfo.thumbnailUrl || null,
          effectiveStatus: creativeInfo.effectiveStatus || null,
          status: creativeInfo.status || null,
          adsetName: row.adset_name,
          campaignName: row.campaign_name,
          objectiveRaw: objectiveInfo.objectiveRaw,
          objectiveLabel: objectiveInfo.objectiveLabel,
          strategicObjective: objectiveInfo.strategicObjective,
          spend,
          impressions: parseInt(row.impressions || '0', 10),
          reach: parseInt(row.reach || '0', 10),
          clicks: parseInt(row.clicks || '0', 10),
          ctr: parseFloat(row.ctr || '0'),
          cpc: parseFloat(row.cpc || '0'),
          results,
          cpr: Math.round(cpr * 100) / 100,
        };
      })
      .filter((ad) => ad.effectiveStatus === 'ACTIVE')
      .sort((a, b) => b.spend - a.spend);

    const totalSpend = campaigns.reduce((sum, row) => sum + row.spend, 0);
    const totalImpressions = campaigns.reduce((sum, row) => sum + row.impressions, 0);
    const totalReach = campaigns.reduce((sum, row) => sum + row.reach, 0);
    const totalClicks = campaigns.reduce((sum, row) => sum + row.clicks, 0);
    const totalResults = campaigns.reduce((sum, row) => sum + row.results, 0);
    const totalWhatsAppConversations = campaigns.reduce((sum, row) => sum + (row.whatsAppConversations || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0;
    const avgCostPerWhatsAppConversation = totalWhatsAppConversations > 0 ? totalSpend / totalWhatsAppConversations : 0;

    const campaignsWithPct = campaigns.map((campaign) => ({
      ...campaign,
      spendPct: totalSpend > 0 ? Math.round((campaign.spend / totalSpend) * 100) : 0,
    }));

    const withResults = campaignsWithPct.filter((campaign) => campaign.results > 0 && campaign.cpr > 0);
    const bestCpr = withResults.length > 0
      ? withResults.reduce((best, row) => (row.cpr < best.cpr ? row : best), withResults[0])
      : null;
    const worstCpr = withResults.length > 0
      ? withResults.reduce((worst, row) => (row.cpr > worst.cpr ? row : worst), withResults[0])
      : null;

    return NextResponse.json({
      period: buildPtBrDateLabel(range),
      accountId: metaToken.accountId,
      accountName: metaToken.accountName,
      summary: {
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalImpressions,
        totalReach,
        totalClicks,
        totalResults,
        totalWhatsAppConversations,
        avgCtr: Math.round(avgCtr * 100) / 100,
        avgCpc: Math.round(avgCpc * 100) / 100,
        avgCpm: Math.round(avgCpm * 100) / 100,
        avgCpr: Math.round(avgCpr * 100) / 100,
        avgCostPerWhatsAppConversation: Math.round(avgCostPerWhatsAppConversation * 100) / 100,
      },
      campaigns: campaignsWithPct,
      adsets,
      ads,
      objectiveBreakdown: buildObjectiveBreakdown(campaignsWithPct),
      highlights: {
        bestCpr,
        worstCpr,
        topSpend: campaignsWithPct[0] || null,
        concentrated: campaignsWithPct.filter((campaign) => campaign.spendPct >= 50),
      },
    });
  } catch (error) {
    console.error('Campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 });
  }
}
