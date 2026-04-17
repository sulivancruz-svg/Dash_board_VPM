import { NextRequest, NextResponse } from 'next/server';
import {
  getSalesAggregationByClient,
  getSalesByDateRange,
} from '@/lib/db';
import { ClientsData } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());

    // Get all sales for the period
    const sales = await getSalesByDateRange(startDate, endDate);
    const clientAgg = await getSalesAggregationByClient(startDate, endDate);

    // Calculate client data
    const clientsData: ClientsData[] = clientAgg.map((client) => {
      const clientSales = sales.filter((s) => s.client === client.name);
      const lastPurchase = clientSales.length > 0 ? new Date(Math.max(...clientSales.map((s) => new Date(s.date).getTime()))) : endDate;
      const productsCount = new Set(clientSales.map((s) => s.product)).size;

      return {
        id: client.name,
        name: client.name,
        totalPurchases: client.purchases,
        totalSpent: client.amount,
        avgTicket: client.purchases > 0 ? client.amount / client.purchases : 0,
        lastPurchaseDate: lastPurchase,
        productsCount,
        status: 'ACTIVE',
      };
    });

    // Sort by spending descending
    clientsData.sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json(clientsData);
  } catch (error) {
    console.error('Clients API error:', error);
    return NextResponse.json({ error: 'Failed to fetch clients data' }, { status: 500 });
  }
}
