import { NextRequest, NextResponse } from 'next/server';
import { getSourceControls, setSourceControls } from '@/lib/source-controls';

export async function GET() {
  return NextResponse.json(await getSourceControls());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<{
      sdrEnabled: boolean;
      pipedriveEnabled: boolean;
      googleAdsEnabled: boolean;
    }>;

    const current = await getSourceControls();
    const nextControls = await setSourceControls({
      sdrEnabled: typeof body.sdrEnabled === 'boolean' ? body.sdrEnabled : current.sdrEnabled,
      pipedriveEnabled: typeof body.pipedriveEnabled === 'boolean' ? body.pipedriveEnabled : current.pipedriveEnabled,
      googleAdsEnabled: typeof body.googleAdsEnabled === 'boolean' ? body.googleAdsEnabled : current.googleAdsEnabled,
    });

    return NextResponse.json({
      message: 'Controles de fontes atualizados com sucesso',
      controls: nextControls,
    });
  } catch (error) {
    console.error('Error updating source controls:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar fontes do dashboard' },
      { status: 500 }
    );
  }
}
