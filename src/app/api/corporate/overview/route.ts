import { NextResponse } from 'next/server';
import { getCorporateOverviewMetrics, getMonthlyTrend, getTopSellers, getTopClients, getProductBreakdown, getBehavioralProfiles } from '@/lib/corporate/db';

// Corporate API - Task 6
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
