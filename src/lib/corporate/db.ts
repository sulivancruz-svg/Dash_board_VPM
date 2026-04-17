import { prisma } from '@/lib/db';
import { CorporateSale } from '@prisma/client';

export interface CorporateOverviewMetrics {
  totalSales: number;
  totalRevenue: number;
  totalBilling: number;
  avgTicket: number;
  revenueGrowth: number;
}

export async function getCorporateOverviewMetrics(): Promise<CorporateOverviewMetrics> {
  const sales = await prisma.corporateSale.findMany();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const last30d = sales.filter((s: CorporateSale) => s.saleDate >= thirtyDaysAgo);
  const prev30d = sales.filter((s: CorporateSale) => s.saleDate >= sixtyDaysAgo && s.saleDate < thirtyDaysAgo);

  const totalRevenue = sales.reduce((sum: number, s: CorporateSale) => sum + s.revenue, 0);
  const totalBilling = sales.reduce((sum: number, s: CorporateSale) => sum + s.billing, 0);
  const revenueGrowth = last30d.length > 0 ?
    ((last30d.reduce((sum: number, s: CorporateSale) => sum + s.revenue, 0) - prev30d.reduce((sum: number, s: CorporateSale) => sum + s.revenue, 0)) /
     (prev30d.reduce((sum: number, s: CorporateSale) => sum + s.revenue, 0) || 1) * 100) : 0;

  return {
    totalSales: sales.length,
    totalRevenue,
    totalBilling,
    avgTicket: sales.length > 0 ? totalBilling / sales.length : 0,
    revenueGrowth,
  };
}

export interface SellerData {
  name: string;
  revenue: number;
  sales: number;
  avgTicket: number;
}

export async function getTopSellers(limit = 10): Promise<SellerData[]> {
  const sales = await prisma.corporateSale.findMany();
  const sellerMap = new Map<string, { revenue: number; count: number }>();

  sales.forEach((s: CorporateSale) => {
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

export interface ClientData {
  name: string;
  revenue: number;
  sales: number;
  avgTicket: number;
}

export async function getTopClients(limit = 15): Promise<ClientData[]> {
  const sales = await prisma.corporateSale.findMany();
  const clientMap = new Map<string, { revenue: number; count: number }>();

  sales.forEach((s: CorporateSale) => {
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

export interface ProductBreakdown {
  name: string;
  revenue: number;
  count: number;
  pct: number;
}

export async function getProductBreakdown(): Promise<ProductBreakdown[]> {
  const sales = await prisma.corporateSale.findMany();
  const productMap = new Map<string, { revenue: number; count: number }>();

  sales.forEach((s: CorporateSale) => {
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

export interface MonthlyTrend {
  month: string;
  revenue: number;
  billing: number;
}

export async function getMonthlyTrend(): Promise<MonthlyTrend[]> {
  const sales = await prisma.corporateSale.findMany({ orderBy: { saleDate: 'asc' } });
  const monthlyMap = new Map<string, { revenue: number; billing: number }>();

  sales.forEach((s: CorporateSale) => {
    const monthKey = s.saleDate.toISOString().substring(0, 7);
    const current = monthlyMap.get(monthKey) || { revenue: 0, billing: 0 };
    current.revenue += s.revenue;
    current.billing += s.billing;
    monthlyMap.set(monthKey, current);
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));
}

export interface BehavioralProfile {
  profile: string;
  revenue: number;
}

export async function getBehavioralProfiles(): Promise<BehavioralProfile[]> {
  const sales = await prisma.corporateSale.findMany();
  const profileMap = new Map<string, number>();

  sales.forEach((s: CorporateSale) => {
    profileMap.set(s.profile, (profileMap.get(s.profile) || 0) + s.revenue);
  });

  return Array.from(profileMap.entries()).map(([profile, revenue]) => ({ profile, revenue }));
}
