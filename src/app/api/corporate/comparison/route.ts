import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let period = parseInt(searchParams.get('period') || '30');

    // Validação: mín 1, máx 365 dias
    if (isNaN(period) || period < 1) period = 30;
    if (period > 365) period = 365;

    const now = new Date();
    const p2End = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
    const p2Start = new Date(p2End.getTime() - period * 24 * 60 * 60 * 1000);
    const p1Start = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

    const p1 = await prisma.corporateSale.findMany({
      where: { saleDate: { gte: p1Start, lte: now } },
    });

    const p2 = await prisma.corporateSale.findMany({
      where: { saleDate: { gte: p2Start, lte: p2End } },
    });

    const p1Revenue = p1.reduce((s: number, x: { revenue: number }) => s + x.revenue, 0);
    const p2Revenue = p2.reduce((s: number, x: { revenue: number }) => s + x.revenue, 0);
    const growth = p2Revenue > 0 ? ((p1Revenue - p2Revenue) / p2Revenue) * 100 : 0;

    return NextResponse.json({
      p1: { revenue: p1Revenue, sales: p1.length, avgTicket: p1.length > 0 ? p1Revenue / p1.length : 0 },
      p2: { revenue: p2Revenue, sales: p2.length, avgTicket: p2.length > 0 ? p2Revenue / p2.length : 0 },
      growth,
    });
  } catch (error) {
    console.error('[comparison] error:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}
