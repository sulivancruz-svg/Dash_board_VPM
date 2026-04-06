import { NextRequest, NextResponse } from 'next/server';
import { parseSdrExcel, validateSdrDeal } from '@/lib/etl/sdr-parser';
import { normalizeChannel } from '@/lib/channel-mapping';
import { setSdrData } from '@/lib/data-store';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseSdrExcel(Buffer.from(buffer));

    const validatedDeals = parsed.deals.map(deal => ({
      ...validateSdrDeal(deal),
      channelNormalized: normalizeChannel(deal.channelRaw) || deal.channelRaw || 'Outros',
    }));

    const validDeals = validatedDeals.filter(d => d.dealValue && d.dealValue > 0);

    // Agregar por canal
    const channelMap = new Map<string, { vendas: number; receita: number; leads: number }>();
    for (const deal of validDeals) {
      const canal = deal.channelNormalized;
      const cur = channelMap.get(canal) || { vendas: 0, receita: 0, leads: 0 };
      channelMap.set(canal, {
        vendas: cur.vendas + 1,
        receita: cur.receita + (deal.dealValue || 0),
        leads: cur.leads,
      });
    }

    const channels = Array.from(channelMap.entries()).map(([canal, d]) => ({
      canal,
      vendas: d.vendas,
      receita: d.receita,
      ticket: d.vendas > 0 ? Math.round(d.receita / d.vendas) : 0,
    })).sort((a, b) => b.receita - a.receita);

    // Agregar por mês (summary) — inclui ano para evitar colisão entre abas
    const MONTH_NUM: Record<string, number> = {
      janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
      julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
    };
    const monthMap = new Map<string, { year?: number; leads: number; qualified: number; sales: number }>();
    for (const row of parsed.summary) {
      // Chave composta ano+mês para evitar colisão entre 2025 e 2026
      const key = row.year ? `${row.year}-${row.monthName.toLowerCase()}` : row.monthName.toLowerCase();
      monthMap.set(key, {
        year: row.year,
        leads: row.leadsTotal,
        qualified: row.leadsQualified,
        sales: row.dealsClosed,
      });
    }
    const months = Array.from(monthMap.entries())
      .map(([key, d]) => ({ month: key.includes('-') ? key.split('-').slice(1).join('-') : key, ...d }))
      .sort((a, b) => {
        const yearDiff = (a.year ?? 0) - (b.year ?? 0);
        if (yearDiff !== 0) return yearDiff;
        const aNum = MONTH_NUM[a.month.toLowerCase()] ?? 99;
        const bNum = MONTH_NUM[b.month.toLowerCase()] ?? 99;
        return aNum - bNum;
      });

    const totals = channels.reduce((acc, c) => ({
      vendas: acc.vendas + c.vendas,
      receita: acc.receita + c.receita,
    }), { vendas: 0, receita: 0 });

    const totalLeads = parsed.summary.reduce((s, r) => s + r.leadsTotal, 0);
    const totalQualified = parsed.summary.reduce((s, r) => s + r.leadsQualified, 0);

    await setSdrData({
      updatedAt: new Date().toISOString(),
      totalLeads,
      totalQualified,
      totalSales: totals.vendas,
      totalRevenue: totals.receita,
      channels,
      months,
    });

    return NextResponse.json({
      message: 'SDR importado com sucesso',
      rowCount: validatedDeals.length,
      validRows: validDeals.length,
      errorRows: validatedDeals.length - validDeals.length,
      channels: channels.map(c => c.canal),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao processar arquivo SDR' }, { status: 500 });
  }
}
