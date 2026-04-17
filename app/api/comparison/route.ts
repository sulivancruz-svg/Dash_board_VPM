import { NextRequest, NextResponse } from 'next/server';
import { getSalesByDateRange } from '@/lib/db';
import { ComparisonData } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());

    // Calculate period length in days
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Previous period
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodLength);

    // Get sales for both periods
    const currentSales = await getSalesByDateRange(startDate, endDate);
    const previousSales = await getSalesByDateRange(previousStartDate, previousEndDate);

    // Calculate metrics
    const currentTotalSales = currentSales.length;
    const currentTotalRevenue = currentSales.reduce((sum, s) => sum + s.amount, 0);
    const currentAvgTicket = currentTotalSales > 0 ? currentTotalRevenue / currentTotalSales : 0;

    const previousTotalSales = previousSales.length;
    const previousTotalRevenue = previousSales.reduce((sum, s) => sum + s.amount, 0);
    const previousAvgTicket = previousTotalSales > 0 ? previousTotalRevenue / previousTotalSales : 0;

    // Calculate growth
    const salesGrowth = previousTotalSales > 0 ? ((currentTotalSales - previousTotalSales) / previousTotalSales) * 100 : currentTotalSales > 0 ? 100 : 0;
    const revenueGrowth = previousTotalRevenue > 0 ? ((currentTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 : currentTotalRevenue > 0 ? 100 : 0;
    const avgTicketGrowth = previousAvgTicket > 0 ? ((currentAvgTicket - previousAvgTicket) / previousAvgTicket) * 100 : currentAvgTicket > 0 ? 100 : 0;

    const response: ComparisonData = {
      period: `${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}`,
      previousPeriod: {
        totalSales: previousTotalSales,
        totalRevenue: Math.round(previousTotalRevenue * 100) / 100,
        avgTicket: Math.round(previousAvgTicket * 100) / 100,
      },
      currentPeriod: {
        totalSales: currentTotalSales,
        totalRevenue: Math.round(currentTotalRevenue * 100) / 100,
        avgTicket: Math.round(currentAvgTicket * 100) / 100,
      },
      growth: {
        salesGrowth: Math.round(salesGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        avgTicketGrowth: Math.round(avgTicketGrowth * 100) / 100,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
  }
}
