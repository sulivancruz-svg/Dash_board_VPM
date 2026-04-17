import { prisma } from '@/lib/db';

export async function getCorporateOverviewMetrics() {
  const sales = await prisma.corporateSale.findMany();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const last30d = sales.filter((s: any) => s.saleDate >= thirtyDaysAgo);
  const prev30d = sales.filter((s: any) => s.saleDate >= sixtyDaysAgo && s.saleDate < thirtyDaysAgo);

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + s.revenue, 0);
  const totalBilling = sales.reduce((sum: number, s: any) => sum + s.billing, 0);
  const revenueGrowth = last30d.length > 0 ?
    ((last30d.reduce((sum: number, s: any) => sum + s.revenue, 0) - prev30d.reduce((sum: number, s: any) => sum + s.revenue, 0)) /
     (prev30d.reduce((sum: number, s: any) => sum + s.revenue, 0) || 1) * 100) : 0;

  return {
    totalSales: sales.length,
    totalRevenue,
    totalBilling,
    avgTicket: sales.length > 0 ? totalBilling / sales.length : 0,
    revenueGrowth,
  };
}

export async function getTopSellers(limit = 10) {
  const sales = await prisma.corporateSale.findMany();
  const sellerMap = new Map<string, { revenue: number; count: number }>();

  sales.forEach((s: any) => {
    const current = sellerMap.get(s.seller) || { revenue: 0, count: 0 };
    current.revenue += s.revenue;
    current.count += 1;
    sellerMap.set(s.seller, current);
  });

  return Array.from(sellerMap.entries())
    .map(([name, data]) => ({ name, revenue: data.revenue, sales: data.count, avgTicket: data.revenue / data.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getTopClients(limit = 15) {
  const sales = await prisma.corporateSale.findMany();
  const clientMap = new Map<string, { revenue: number; count: number }>();

  sales.forEach((s: any) => {
    const current = clientMap.get(s.client) || { revenue: 0, count: 0 };
    current.revenue += s.revenue;
    current.count += 1;
    clientMap.set(s.client, current);
  });

  return Array.from(clientMap.entries())
    .map(([name, data]) => ({ name, revenue: data.revenue, sales: data.count, avgTicket: data.revenue / data.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getProductBreakdown() {
  const sales = await prisma.corporateSale.findMany();
  const productMap = new Map<string, { revenue: number; count: number }>();

  sales.forEach((s: any) => {
    const current = productMap.get(s.product) || { revenue: 0, count: 0 };
    current.revenue += s.revenue;
    current.count += 1;
    productMap.set(s.product, current);
  });

  const products = Array.from(productMap.entries())
    .map(([name, data]) => ({ name, revenue: data.revenue, count: data.count, pct: 0 }));

  const total = products.reduce((sum, p) => sum + p.revenue, 0);
  return products.map(p => ({ ...p, pct: total > 0 ? (p.revenue / total) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);
}

export async function getMonthlyTrend() {
  const sales = await prisma.corporateSale.findMany({ orderBy: { saleDate: 'asc' } });
  const monthlyMap = new Map<string, { revenue: number; billing: number }>();

  sales.forEach((s: any) => {
    const monthKey = s.saleDate.toISOString().substring(0, 7);
    const current = monthlyMap.get(monthKey) || { revenue: 0, billing: 0 };
    current.revenue += s.revenue;
    current.billing += s.billing;
    monthlyMap.set(monthKey, current);
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));
}

export async function getBehavioralProfiles() {
  const sales = await prisma.corporateSale.findMany();
  const profileMap = new Map<string, number>();

  sales.forEach((s: any) => {
    profileMap.set(s.profile, (profileMap.get(s.profile) || 0) + s.revenue);
  });

  return Array.from(profileMap.entries()).map(([profile, revenue]) => ({ profile, revenue }));
}
