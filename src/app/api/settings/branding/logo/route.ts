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
    const settings = await getBrandingSettings();
    if (!settings.logoPath) {
      return new NextResponse('Logo nao configurada', { status: 404 });
    }

    // Production: logoPath is a Vercel Blob URL (public) — proxy to avoid CORS/caching issues
    if (settings.logoPath.startsWith('https://')) {
      const fetchHeaders: Record<string, string> = {};
      // Include auth token only if the blob may be private (legacy uploads)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        fetchHeaders.Authorization = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
      }
      const res = await fetch(settings.logoPath, {
        headers: fetchHeaders,
        cache: 'no-store',
      });
      if (!res.ok) {
        console.error('Blob logo fetch failed:', res.status, await res.text().catch(() => ''));
        return new NextResponse('Logo nao encontrada no blob store', { status: 404 });
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || getContentType(settings.logoPath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      });
    }

    // Local dev: logoPath is a filesystem path like /branding-assets/logo.png
    const absolutePath = path.join(
      process.cwd(),
      'public',
      settings.logoPath.replace(/^\//, '').replace(/\//g, path.sep),
    );
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
