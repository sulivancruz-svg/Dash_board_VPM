import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTopSellers } from '@/lib/corporate/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let limit = parseInt(searchParams.get('limit') || '50');

    // Validação: mín 1, máx 500
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 500) limit = 500;

    const sellers = await getTopSellers(limit);
    return NextResponse.json({ sellers });
  } catch (error) {
    console.error('[sellers] error:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}
