import { NextResponse } from 'next/server';
import { getBrandingSettings, getLogoData } from '@/lib/branding-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getBrandingSettings();
    if (!settings.logoPath) {
      return new NextResponse('Logo nao configurada', { status: 404 });
    }

    // Logo stored as base64 in KV
    const logoData = await getLogoData();
    if (!logoData?.base64) {
      return new NextResponse('Logo nao encontrada', { status: 404 });
    }

    const buffer = Buffer.from(logoData.base64, 'base64');
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': logoData.contentType || 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Branding logo error:', error);
    return new NextResponse('Erro ao carregar logo', { status: 500 });
  }
}
