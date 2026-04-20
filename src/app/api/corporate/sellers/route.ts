// src/app/api/corporate/sellers/route.ts
import { NextResponse } from 'next/server';
import { getTopSellers } from '@/lib/corporate/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const sellers = await getTopSellers(limit);
    return NextResponse.json({ sellers });
  } catch (error) {
    console.error('[sellers] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
