import { NextRequest, NextResponse } from 'next/server';
import { filterSalesByDateRange, getGoogleSheetsData, parseSalesData } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_CORPORATE_ID;
    const sheetGid = process.env.GOOGLE_SHEETS_CORPORATE_GID;
    const apiKey = process.env.GOOGLE_SHEETS_CORPORATE_API_KEY;

    if (!spreadsheetId || !sheetGid || !apiKey) {
      return NextResponse.json({ error: 'Google Sheets configuration missing' }, { status: 400 });
    }

    const { headers, data } = await getGoogleSheetsData(spreadsheetId, sheetGid, apiKey);
    const allSales = parseSalesData(data, headers);

    const requestedEndDate = req.nextUrl.searchParams.get('endDate');
    const requestedStartDate = req.nextUrl.searchParams.get('startDate');
    const endDate = requestedEndDate ? parseLocalDate(requestedEndDate) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = requestedStartDate
      ? parseLocalDate(requestedStartDate)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
    const periodLengthMs = Math.max(86400000, endDate.getTime() - startDate.getTime());
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodLengthMs);

    const currentSales = filterSalesByDateRange(
      allSales,
      toDateKey(startDate),
      toDateKey(endDate)
    );
    const previousSales = filterSalesByDateRange(
      allSales,
      toDateKey(previousStartDate),
      toDateKey(previousEndDate)
    );

    const metrics = (items: typeof allSales) => {
      const totalSales = items.length;
      const totalRevenue = items.reduce((sum, sale) => sum + sale.value, 0);
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      return {
        totalSales,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        avgTicket: Number(avgTicket.toFixed(2)),
      };
    };

    const previousPeriod = metrics(previousSales);
    const currentPeriod = metrics(currentSales);
    const growth = (current: number, previous: number) =>
      previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(2)) : current > 0 ? 100 : 0;

    return NextResponse.json({
      period: `${toDateKey(startDate)} a ${toDateKey(endDate)}`,
      currentPeriodRange: {
        startDate: toDateKey(startDate),
        endDate: toDateKey(endDate),
        label: formatDateRange(startDate, endDate),
      },
      previousPeriodRange: {
        startDate: toDateKey(previousStartDate),
        endDate: toDateKey(previousEndDate),
        label: formatDateRange(previousStartDate, previousEndDate),
      },
      previousPeriod,
      currentPeriod,
      growth: {
        salesGrowth: growth(currentPeriod.totalSales, previousPeriod.totalSales),
        revenueGrowth: growth(currentPeriod.totalRevenue, previousPeriod.totalRevenue),
        avgTicketGrowth: growth(currentPeriod.avgTicket, previousPeriod.avgTicket),
      },
      chartData: [
        { name: 'Vendas', anterior: previousPeriod.totalSales, atual: currentPeriod.totalSales },
        { name: 'Receita', anterior: previousPeriod.totalRevenue, atual: currentPeriod.totalRevenue },
        { name: 'Ticket médio', anterior: previousPeriod.avgTicket, atual: currentPeriod.avgTicket },
      ],
    });
  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateRange(startDate: Date, endDate: Date) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `${formatter.format(startDate)} a ${formatter.format(endDate)}`;
}
