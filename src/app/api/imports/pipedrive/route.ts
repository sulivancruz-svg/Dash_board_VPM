import { NextRequest, NextResponse } from 'next/server';
import { setPipedriveData } from '@/lib/data-store';
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
    const directData = getPipedriveDirectData();
    const store = buildPipedriveDashboardStore({
      updatedAt: new Date().toISOString(),
      mondeDeals: parsed.mondeDeals ?? [],
      pipelineDeals: parsed.pipelineDeals ?? [],
      directData,
      fallbackPeriod: parsed.period,
    });

    setPipedriveData(store);

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
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(process.cwd(), '.pipedrive-data.json');

    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Dados nao encontrados' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(fs.readFileSync(dataPath, 'utf-8')));
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao ler dados' }, { status: 500 });
  }
}
