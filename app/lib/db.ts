import prisma from './prisma';
import { CorporateSale, OverviewData, SellersData, ClientsData, ProductsData, BehavioralData, ComparisonData } from '@/types';

/**
 * Get all corporate sales for a date range
 */
export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  return prisma.corporateSale.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      seller: true,
    },
    orderBy: {
      date: 'desc',
    },
  });
}

/**
 * Get sales aggregation by seller
 */
export async function getSalesAggregationBySeller(startDate: Date, endDate: Date) {
  const sales = await prisma.corporateSale.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      seller: true,
    },
  });

  const grouped: { [key: string]: { name: string; sales: number; amount: number; commission: number } } = {};

  for (const sale of sales) {
    if (!grouped[sale.sellerId]) {
      grouped[sale.sellerId] = {
        name: sale.seller.name,
        sales: 0,
        amount: 0,
        commission: 0,
      };
    }
    grouped[sale.sellerId].sales += 1;
    grouped[sale.sellerId].amount += sale.amount;
    grouped[sale.sellerId].commission += sale.commission;
  }

  return Object.entries(grouped).map(([id, data]) => ({
    id,
    ...data,
  }));
}

/**
 * Get sales aggregation by client
 */
export async function getSalesAggregationByClient(startDate: Date, endDate: Date) {
  const sales = await prisma.corporateSale.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const grouped: { [key: string]: { purchases: number; amount: number } } = {};

  for (const sale of sales) {
    if (!grouped[sale.client]) {
      grouped[sale.client] = {
        purchases: 0,
        amount: 0,
      };
    }
    grouped[sale.client].purchases += 1;
    grouped[sale.client].amount += sale.amount;
  }

  return Object.entries(grouped).map(([name, data]) => ({
    name,
    ...data,
  }));
}

/**
 * Get sales aggregation by product
 */
export async function getSalesAggregationByProduct(startDate: Date, endDate: Date) {
  const sales = await prisma.corporateSale.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const grouped: { [key: string]: { sales: number; amount: number } } = {};

  for (const sale of sales) {
    if (!grouped[sale.product]) {
      grouped[sale.product] = {
        sales: 0,
        amount: 0,
      };
    }
    grouped[sale.product].sales += 1;
    grouped[sale.product].amount += sale.amount;
  }

  return Object.entries(grouped).map(([name, data]) => ({
    name,
    ...data,
  }));
}

/**
 * Calculate daily sales aggregation
 */
export async function getDailySalesAggregation(startDate: Date, endDate: Date) {
  const sales = await prisma.corporateSale.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const grouped: { [key: string]: { sales: number; amount: number } } = {};

  for (const sale of sales) {
    const dateKey = sale.date.toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        sales: 0,
        amount: 0,
      };
    }
    grouped[dateKey].sales += 1;
    grouped[dateKey].amount += sale.amount;
  }

  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get all users
 */
export async function getAllUsers() {
  return prisma.user.findMany();
}

/**
 * Create a new corporate sale
 */
export async function createCorporateSale(data: Omit<CorporateSale, 'id' | 'createdAt' | 'updatedAt'>) {
  return prisma.corporateSale.create({
    data: data as any,
    include: {
      seller: true,
    },
  });
}

/**
 * Update a corporate sale
 */
export async function updateCorporateSale(id: string, data: Partial<CorporateSale>) {
  return prisma.corporateSale.update({
    where: { id },
    data: data as any,
    include: {
      seller: true,
    },
  });
}

/**
 * Delete a corporate sale
 */
export async function deleteCorporateSale(id: string) {
  return prisma.corporateSale.delete({
    where: { id },
  });
}
