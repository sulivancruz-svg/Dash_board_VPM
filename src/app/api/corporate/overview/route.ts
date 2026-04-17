import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getCorporateOverviewMetrics, getMonthlyTrend, getTopSellers, getTopClients, getProductBreakdown, getBehavioralProfiles } from '@/lib/corporate/db';

// Corporate API - Task 6
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const [metrics, monthlyTrend, topSellers, topClients, products, profiles] = await Promise.all([
      getCorporateOverviewMetrics(),
      getMonthlyTrend(),
      getTopSellers(8),
      getTopClients(15),
      getProductBreakdown(),
      getBehavioralProfiles(),
    ]);

    return NextResponse.json({
      metrics,
      monthlyTrend,
      topSellers,
      topClients,
      products,
      profiles,
    });
  } catch (error) {
    console.error('[overview] error:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}
