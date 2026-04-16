import { NextResponse } from 'next/server';
import { setPipedriveData } from '@/lib/data-store';

/**
 * Temporary endpoint to save Monde data directly from JSON payload.
 * This endpoint will be deleted after data is restored.
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    console.log('[temp-save-monde] Saving Monde data...');
    console.log('[temp-save-monde] Deals:', data.totalDeals, 'Revenue:', data.totalRevenue);

    // Save to blob storage
    await setPipedriveData(data);

    console.log('[temp-save-monde] Data saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Monde data saved successfully',
      deals: data.totalDeals,
      revenue: data.totalRevenue
    });
  } catch (error) {
    console.error('[temp-save-monde] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save data', details: String(error) },
      { status: 500 }
    );
  }
}
