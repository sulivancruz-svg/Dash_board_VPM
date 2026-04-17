import { NextRequest, NextResponse } from 'next/server';
import { setPipedriveData, setPipedriveMondeSnapshot } from '@/lib/data-store';
import { parsePipedriveExcel } from '@/lib/etl/pipedrive-parser';
import { buildPipedriveDashboardStore } from '@/lib/pipedrive-dashboard-store';
import { getPipedriveDirectData } from '@/lib/pipedrive-direct-store';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const parsed = parsePipedriveExcel(Buffer.from(buffer));
    const updatedAt = new Date().toISOString();
    const directData = await getPipedriveDirectData();
    await setPipedriveMondeSnapshot({
      updatedAt,
      period: parsed.period,
      mondeDeals: parsed.mondeDeals ?? [],
      pipelineDeals: parsed.pipelineDeals ?? [],
    });
    const store = buildPipedriveDashboardStore({
      updatedAt,
      mondeDeals: parsed.mondeDeals ?? [],
      pipelineDeals: parsed.pipelineDeals ?? [],
      directData,
      fallbackPeriod: parsed.period,
    });

    await setPipedriveData(store);

    return NextResponse.json({
      message: directData?.allDeals?.length
        ? 'Monde importado com sucesso e cruzado com o Pipedrive direto'
        : 'Pipe Monde importado com sucesso',
      totalDeals: store.totalDeals,
      totalRevenue: store.totalRevenue,
      totalTransacoes: store.totalTransacoes,
      ticketMedio: store.ticketMedio,
      totalLeads: store.totalLeads,
      period: store.period,
      channels: store.channels.map((channel) =>
        `${channel.canal}: ${channel.vendas} deals, R$${channel.receita.toLocaleString('pt-BR')}`
      ),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao processar Pipedrive:', msg);
    return NextResponse.json({ error: `Erro ao processar arquivo Pipe Monde: ${msg}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { getPipedriveData: getPD, getPipedriveMondeSnapshot: getMonde } = await import('@/lib/data-store');
    const data = await getPD();
    if (data) {
      return NextResponse.json(data);
    }

    const mondeSnapshot = await getMonde();
    if (!mondeSnapshot) {
      return NextResponse.json({ error: 'Dados nao encontrados' }, { status: 404 });
    }

    const directData = await getPipedriveDirectData();
    const store = buildPipedriveDashboardStore({
      updatedAt: mondeSnapshot.updatedAt,
      mondeDeals: mondeSnapshot.mondeDeals,
      pipelineDeals: mondeSnapshot.pipelineDeals,
      directData,
      fallbackPeriod: mondeSnapshot.period,
    });
    await setPipedriveData(store);
    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao ler dados' }, { status: 500 });
  }
}
