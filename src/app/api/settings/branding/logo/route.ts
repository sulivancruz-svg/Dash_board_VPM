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

    // Production: logoPath is a Vercel Blob URL
    if (settings.logoPath.startsWith('https://')) {
      // Step 1: try fetching directly (works for public blobs)
      let res = await fetch(settings.logoPath, { cache: 'no-store' });

      // Step 2: fallback — use Vercel Blob SDK get() for private blobs
      if (!res.ok && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { get } = await import('@vercel/blob');
          const blobResult = await get(settings.logoPath, { access: 'private' } as Parameters<typeof get>[1]);
          if (blobResult) {
            // blobResult is a Response-like object with stream
            const stream = (blobResult as unknown as { stream: ReadableStream }).stream;
            if (stream) {
              const chunks: Uint8Array[] = [];
              const reader = stream.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) chunks.push(value);
              }
              const buffer = Buffer.concat(chunks);
              return new NextResponse(buffer, {
                status: 200,
                headers: {
                  'Content-Type': getContentType(settings.logoPath),
                  'Cache-Control': 'public, max-age=3600',
                },
              });
            }
          }
        } catch (sdkErr) {
          console.error('Blob SDK get() failed:', sdkErr);
        }

        // Step 3: last resort — try with Authorization header
        res = await fetch(settings.logoPath, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        });
      }

      if (!res.ok) {
        console.error('Blob logo fetch failed:', res.status, settings.logoPath);
        return new NextResponse('Logo nao encontrada', { status: 404 });
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
