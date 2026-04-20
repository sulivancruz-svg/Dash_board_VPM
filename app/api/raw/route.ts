import { NextRequest, NextResponse } from 'next/server';
import { filterSalesByDateRange, getGoogleSheetsData, parseSalesData } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_CORPORATE_ID;
    const sheetGid = process.env.GOOGLE_SHEETS_CORPORATE_GID;
    const apiKey = process.env.GOOGLE_SHEETS_CORPORATE_API_KEY;

    if (!spreadsheetId || !sheetGid || !apiKey) {
      return NextResponse.json(
        { error: 'Google Sheets configuration missing' },
        { status: 400 }
      );
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '50', 10);

    // Fetch raw data from Google Sheets
    const { headers, data } = await getGoogleSheetsData(spreadsheetId, sheetGid, apiKey);
    const sales = filterSalesByDateRange(
      parseSalesData(data, headers),
      req.nextUrl.searchParams.get('startDate'),
      req.nextUrl.searchParams.get('endDate')
    );

    // Apply pagination
    const total = sales.length;
    const skipCount = (page - 1) * pageSize;
    const paginatedSales = sales.slice(skipCount, skipCount + pageSize);

    // Transform to raw data format
    const rawData = paginatedSales.map((s, idx) => ({
      id: `${skipCount + idx}`,
      date: s.date,
      sellerId: s.seller,
      sellerName: s.seller,
      client: s.client,
      product: s.product,
      amount: Number(s.value.toFixed(2)),
      commission: Number(s.revenue.toFixed(2)),
      status: s.status || 'Sem status',
      sheetId: spreadsheetId,
      sheetRowId: skipCount + idx + 2,
      lastSyncAt: new Date().toISOString(),
      createdAt: s.date,
      updatedAt: s.date,
      saleNumber: s.saleNumber,
      supplier: s.supplier,
      startDate: s.startDate,
      endDate: s.endDate,
      destination: s.destination,
      personType: s.personType,
      advanceDays: s.advanceDays,
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
    return NextResponse.json(
      { error: 'Failed to fetch raw data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
