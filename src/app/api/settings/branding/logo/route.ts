import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getBrandingSettings } from '@/lib/branding-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function GET() {
  try {
    const settings = getBrandingSettings();
    if (!settings.logoPath) {
      return new NextResponse('Logo nao configurada', { status: 404 });
    }

    const absolutePath = path.join(process.cwd(), 'public', settings.logoPath.replace(/^\//, '').replace(/\//g, path.sep));
    if (!fs.existsSync(absolutePath)) {
      return new NextResponse('Arquivo da logo nao encontrado', { status: 404 });
    }

    const buffer = fs.readFileSync(absolutePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': getContentType(absolutePath),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Branding logo error:', error);
    return new NextResponse('Erro ao carregar logo', { status: 500 });
  }
}
