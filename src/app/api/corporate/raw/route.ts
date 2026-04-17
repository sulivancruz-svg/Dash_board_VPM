import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '50');
    const seller = searchParams.get('seller');
    const client = searchParams.get('client');
    const product = searchParams.get('product');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validação: page mín 1, limit 1-500
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 500) limit = 500;

    const where: Prisma.CorporateSaleWhereInput = {};
    if (seller) where.seller = seller;
    if (client) where.client = client;
    if (product) where.product = product;
    if (startDate) where.saleDate = { gte: new Date(startDate) };
    if (endDate) {
      if (where.saleDate && typeof where.saleDate === 'object' && 'gte' in where.saleDate) {
        where.saleDate = { ...(where.saleDate as { gte: Date }), lte: new Date(endDate) };
      } else {
        where.saleDate = { lte: new Date(endDate) };
      }
    }

    const [data, total] = await Promise.all([
      prisma.corporateSale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { saleDate: 'desc' },
      }),
      prisma.corporateSale.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[raw] error:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}
