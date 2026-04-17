import { NextResponse } from 'next/server';
import { getBehavioralProfiles } from '@/lib/corporate/db';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const profiles = await getBehavioralProfiles();

    // Get lead time distribution for scatter
    const sales = await prisma.corporateSale.findMany({
      select: { leadTimeDays: true, revenue: true, profile: true },
    });

    return NextResponse.json({ profiles, leadTimeDistribution: sales });
  } catch (error) {
    console.error('[behavioral] error:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}
