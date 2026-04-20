// src/app/api/corporate/overview/route.ts
import { NextResponse } from 'next/server';
import { getCorporateOverviewMetrics, getMonthlyTrend, getTopSellers, getTopClients, getProductBreakdown, getBehavioralProfiles } from '@/lib/corporate/db';

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
