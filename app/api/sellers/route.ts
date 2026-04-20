import { NextRequest, NextResponse } from 'next/server';
import { getSellersData } from '@/lib/sellers-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');

    return NextResponse.json(await getSellersData(startDate, endDate));
  } catch (error) {
    console.error('Sellers API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sellers data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
