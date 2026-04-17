import { NextRequest, NextResponse } from 'next/server';
import {
  getSalesAggregationBySeller,
  getSalesByDateRange,
} from '@/lib/db';
import { SellersData } from '@/types';

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
    const sellerAgg = await getSalesAggregationBySeller(startDate, endDate);

    // Calculate seller data
    const sellersData: SellersData[] = sellerAgg.map((seller) => {
      const sellerSales = sales.filter((s) => s.sellerId === seller.id);
      const lastSale = sellerSales.length > 0 ? new Date(Math.max(...sellerSales.map((s) => new Date(s.date).getTime()))) : endDate;

      return {
        id: seller.id,
        name: seller.name,
        totalSales: seller.sales,
        totalRevenue: seller.amount,
        commission: seller.commission,
        avgTicket: seller.sales > 0 ? seller.amount / seller.sales : 0,
        status: 'ACTIVE',
        lastSaleDate: lastSale,
        salesCount: seller.sales,
      };
    });

    // Sort by revenue descending
    sellersData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json(sellersData);
  } catch (error) {
    console.error('Sellers API error:', error);
    return NextResponse.json({ error: 'Failed to fetch sellers data' }, { status: 500 });
  }
}
