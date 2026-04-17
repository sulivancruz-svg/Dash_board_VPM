import { NextRequest, NextResponse } from 'next/server';
import { getSalesByDateRange } from '@/lib/db';
import { BehavioralData } from '@/types';

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

    // Group by hour of day
    const hourlyAgg: { [key: number]: { sales: number; amount: number } } = {};

    for (let i = 0; i < 24; i++) {
      hourlyAgg[i] = { sales: 0, amount: 0 };
    }

    for (const sale of sales) {
      const hour = new Date(sale.date).getHours();
      hourlyAgg[hour].sales += 1;
      hourlyAgg[hour].amount += sale.amount;
    }

    // Group by date
    const dateAgg: { [key: string]: { sales: number; amount: number } } = {};

    for (const sale of sales) {
      const dateKey = sale.date.toISOString().split('T')[0];
      if (!dateAgg[dateKey]) {
        dateAgg[dateKey] = { sales: 0, amount: 0 };
      }
      dateAgg[dateKey].sales += 1;
      dateAgg[dateKey].amount += sale.amount;
    }

    // Combine data - hourly pattern across all days
    const behavioralData: BehavioralData[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const avgSales = Math.ceil(hourlyAgg[hour].sales / Math.max(1, Object.keys(dateAgg).length));
      const avgRevenue = hourlyAgg[hour].amount / Math.max(1, Object.keys(dateAgg).length);
      const avgTicket = avgSales > 0 ? avgRevenue / avgSales : 0;

      behavioralData.push({
        date: new Date().toISOString().split('T')[0],
        hour,
        salesCount: avgSales,
        revenue: Math.round(avgRevenue * 100) / 100,
        avgTicket: Math.round(avgTicket * 100) / 100,
      });
    }

    return NextResponse.json(behavioralData);
  } catch (error) {
    console.error('Behavioral API error:', error);
    return NextResponse.json({ error: 'Failed to fetch behavioral data' }, { status: 500 });
  }
}
