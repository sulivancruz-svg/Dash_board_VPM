import { NextRequest, NextResponse } from 'next/server';
import { getSalesByDateRange } from '@/lib/db';
import { RawSaleData } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());

    // Get all sales for the period
    let sales = await getSalesByDateRange(startDate, endDate);

    // Apply pagination
    const total = sales.length;
    const skipCount = (page - 1) * pageSize;
    sales = sales.slice(skipCount, skipCount + pageSize);

    // Transform to include seller name
    const rawData: RawSaleData[] = sales.map((sale) => ({
      ...sale,
      sellerName: sale.seller.name,
    }));

    return NextResponse.json({
      data: rawData,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Raw data API error:', error);
    return NextResponse.json({ error: 'Failed to fetch raw data' }, { status: 500 });
  }
}
