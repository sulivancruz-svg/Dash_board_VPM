import { NextRequest, NextResponse } from 'next/server';
import {
  getSalesAggregationByProduct,
  getSalesByDateRange,
} from '@/lib/db';
import { ProductsData } from '@/types';

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
    const productAgg = await getSalesAggregationByProduct(startDate, endDate);

    // Calculate product data
    const productsData: ProductsData[] = productAgg.map((product) => {
      const productSales = sales.filter((s) => s.product === product.name);
      const lastSale = productSales.length > 0 ? new Date(Math.max(...productSales.map((s) => new Date(s.date).getTime()))) : endDate;

      return {
        id: product.name,
        name: product.name,
        totalSales: product.sales,
        totalRevenue: product.amount,
        avgPrice: product.sales > 0 ? product.amount / product.sales : 0,
        lastSaleDate: lastSale,
        unitsSold: product.sales,
        status: 'ACTIVE',
      };
    });

    // Sort by revenue descending
    productsData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json(productsData);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Failed to fetch products data' }, { status: 500 });
  }
}
