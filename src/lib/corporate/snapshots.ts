// src/lib/corporate/snapshots.ts
import { prisma } from '@/lib/db';
import { env } from '@/env';

export async function createDailyCorporateSnapshot() {
  const sales = await prisma.corporateSale.findMany({
    orderBy: { saleDate: 'desc' },
  });

  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
  const totalBilling = sales.reduce((sum, s) => sum + s.billing, 0);
  const avgTicket = totalBilling / sales.length;
  const avgLeadTime = Math.round(
    sales.reduce((sum, s) => sum + s.leadTimeDays, 0) / sales.length
  );

  // Group by month
  const monthlyMap = new Map<string, { revenue: number; billing: number }>();
  sales.forEach(s => {
    const monthKey = s.saleDate.toISOString().substring(0, 7);
    const current = monthlyMap.get(monthKey) || { revenue: 0, billing: 0 };
    current.revenue += s.revenue;
    current.billing += s.billing;
    monthlyMap.set(monthKey, current);
  });

  const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  // Find top seller
  const sellerMap = new Map<string, number>();
  sales.forEach(s => {
    sellerMap.set(s.seller, (sellerMap.get(s.seller) || 0) + s.revenue);
  });
  const topSeller = Array.from(sellerMap.entries()).sort((a, b) => b[1] - a[1])[0];

  await prisma.corporateSalesSnapshot.create({
    data: {
      totalSales: sales.length,
      totalRevenue,
      totalBilling,
      avgTicket,
      avgLeadTime,
      topSellerName: topSeller?.[0] || 'N/A',
      topSellerRevenue: topSeller?.[1] || 0,
      monthlyBreakdown,
    },
  });
}

export async function cleanupOldSnapshots() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - env.SNAPSHOT_RETENTION_DAYS);

  await prisma.corporateSalesSnapshot.deleteMany({
    where: { snapshotDate: { lt: cutoffDate } },
  });
}
