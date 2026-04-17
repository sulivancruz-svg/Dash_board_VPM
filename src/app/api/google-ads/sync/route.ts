import { NextResponse } from 'next/server';
import { getGoogleAdsCredentials } from '@/lib/google-ads-credentials-store';
import { syncGoogleAdsDataSnapshot } from '@/lib/google-ads-sync';

export async function POST() {
  try {
    const result = await syncGoogleAdsDataSnapshot();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao sincronizar Google Ads:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar Google Ads' },
      { status: 500 },
    );
  }
}

export async function GET() {
  const creds = await getGoogleAdsCredentials();
  return NextResponse.json({ configured: !!creds });
}
