import { NextResponse } from 'next/server';
import { getProductBreakdown } from '@/lib/corporate/db';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const products = await getProductBreakdown();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('[products] error:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}
