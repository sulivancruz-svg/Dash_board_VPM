import { NextRequest, NextResponse } from 'next/server';
import {
  clearPipedriveDirectCredentials,
  clearPipedriveDirectData,
  getPipedriveDirectCredentials,
  getPipedriveDirectData,
  setPipedriveDirectCredentials,
} from '@/lib/pipedrive-direct-store';
import {
  buildPipedriveDirectPeriodSummary,
  validatePipedriveConnection,
} from '@/lib/integrations/pipedrive-direct';
import { resolveDateRange } from '@/lib/date-range';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const credentials = await getPipedriveDirectCredentials();
  const storedData = await getPipedriveDirectData();
  const searchParams = req.nextUrl.searchParams;
  const { start, end, periodDays } = resolveDateRange(
    searchParams.get('start'),
    searchParams.get('end'),
    Number.parseInt(searchParams.get('period') || '30', 10) || 30,
  );
  const data = storedData ? buildPipedriveDirectPeriodSummary(storedData, start, end) : null;

  return NextResponse.json({
    configured: !!credentials,
    companyName: credentials?.companyName || 'Vai Pro Mundo',
    companyDomain: credentials?.companyDomain || 'vaipromundo',
    connectedAt: credentials?.connectedAt || null,
    lastValidatedAt: credentials?.lastValidatedAt || null,
    lastSync: storedData
      ? {
          updatedAt: storedData.updatedAt,
          totalDeals: storedData.totalDeals,
          totalWon: storedData.totalWon,
          totalOpen: storedData.totalOpen,
          totalLost: storedData.totalLost,
        }
      : null,
    period: {
      start,
      end,
      periodDays,
    },
    data,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companyName = String(body.companyName || 'Vai Pro Mundo').trim();
    const companyDomain = String(body.companyDomain || '').trim().toLowerCase();
    const apiToken = String(body.apiToken || '').trim();

    if (!companyDomain || !apiToken) {
      return NextResponse.json({ error: 'Informe subdominio e token do Pipedrive' }, { status: 400 });
    }

    const validation = await validatePipedriveConnection(companyDomain, apiToken);
    await setPipedriveDirectCredentials({
      companyName,
      companyDomain,
      apiToken,
    });

    return NextResponse.json({
      message: 'Conexao com Pipedrive validada',
      companyName,
      companyDomain,
      totalDealsPreview: validation.totalDealsPreview,
      fieldsDetected: validation.fields.length,
    });
  } catch (error) {
    console.error('Pipedrive direct connect error:', error);
    return NextResponse.json({ error: 'Nao foi possivel validar a conexao com o Pipedrive' }, { status: 500 });
  }
}

export async function DELETE() {
  await clearPipedriveDirectCredentials();
  await clearPipedriveDirectData();
  return NextResponse.json({ message: 'Conexao com Pipedrive removida' });
}
