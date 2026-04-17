import { NextRequest, NextResponse } from 'next/server';
import {
  getSalesByDateRange,
  getSalesAggregationBySeller,
  getSalesAggregationByClient,
  getSalesAggregationByProduct,
  getDailySalesAggregation,
} from '@/lib/db';
import { OverviewData } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());

    // Get sales data
    const sales = await getSalesByDateRange(startDate, endDate);
    const sellerAgg = await getSalesAggregationBySeller(startDate, endDate);
    const clientAgg = await getSalesAggregationByClient(startDate, endDate);
    const productAgg = await getSalesAggregationByProduct(startDate, endDate);
    const dailyAgg = await getDailySalesAggregation(startDate, endDate);

    // Calculate metrics
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
    const uniqueClients = new Set(sales.map((s) => s.client)).size;
    const uniqueProducts = new Set(sales.map((s) => s.product)).size;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Previous period for growth calculation
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setMonth(previousStartDate.getMonth() - 1);

    const previousSales = await getSalesByDateRange(previousStartDate, previousEndDate);
    const previousRevenue = previousSales.reduce((sum, s) => sum + s.amount, 0);
    const growthRate =
      previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : totalRevenue > 0 ? 100 : 0;

    // Top sellers
    const topSeller = sellerAgg.length > 0 ? sellerAgg[0] : null;
    const topClient = clientAgg.length > 0 ? clientAgg[0] : null;
    const topProduct = productAgg.length > 0 ? productAgg[0] : null;

    const response: OverviewData = {
      totalSales,
      totalRevenue,
      totalClients: uniqueClients,
      totalProducts: uniqueProducts,
      avgTicket,
      growthRate,
      topSellerName: topSeller?.name || 'N/A',
      topSellerAmount: topSeller?.amount || 0,
      topClientName: topClient?.name || 'N/A',
      topClientAmount: topClient?.amount || 0,
      topProductName: topProduct?.name || 'N/A',
      topProductAmount: topProduct?.amount || 0,
      salesTrend: dailyAgg.map((d) => ({
        date: d.date,
        sales: d.sales,
        revenue: d.amount,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Overview API error:', error);
    return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 });
  }
}
