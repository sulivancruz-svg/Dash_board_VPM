import { NextResponse } from 'next/server';
import { getTopClients } from '@/lib/corporate/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const clients = await getTopClients(limit);
    return NextResponse.json({ clients });
  } catch (error) {
    console.error('[clients] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
