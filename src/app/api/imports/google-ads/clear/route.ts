import { NextResponse } from 'next/server';
import { clearGoogleAdsStoredData } from '@/lib/google-ads-store';

export async function POST() {
  try {
    await clearGoogleAdsStoredData();

    return NextResponse.json({
      message: 'Dados do Google Ads removidos com sucesso',
    });
  } catch (error) {
    console.error('Erro ao limpar Google Ads:', error);
    return NextResponse.json(
      { error: 'Erro ao remover dados' },
      { status: 500 }
    );
  }
}
