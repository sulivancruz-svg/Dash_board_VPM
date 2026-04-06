import { NextRequest, NextResponse } from 'next/server';
import { setSourceControls } from '@/lib/source-controls';
import { setGoogleAdsStoredData } from '@/lib/google-ads-store';

const MONTH_MAP: Record<number, string> = {
  1: 'janeiro', 2: 'fevereiro', 3: 'março', 4: 'abril',
  5: 'maio', 6: 'junho', 7: 'julho', 8: 'agosto',
  9: 'setembro', 10: 'outubro', 11: 'novembro', 12: 'dezembro',
};

function parseNumber(s: string): number {
  if (!s) return 0;
  // Remove aspas, substitui vírgula por ponto
  return parseFloat(s.replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * POST /api/imports/google-ads/csv
 *
 * Processa o CSV exportado diretamente do Google Ads.
 * Suporta o formato "Visão geral personalizada" com colunas:
 * Dia, Código da moeda, Custo, Interações, Taxa de interação, Impr.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length < 3) {
      return NextResponse.json({ error: 'Arquivo CSV inválido ou vazio' }, { status: 400 });
    }

    // Detectar linha de cabeçalho (contém "Dia" ou "Date")
    let headerIndex = -1;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].toLowerCase().includes('dia') || lines[i].toLowerCase().includes('date')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return NextResponse.json({ error: 'Cabeçalho não encontrado no CSV' }, { status: 400 });
    }

    const headers = lines[headerIndex].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

    // Detectar índices das colunas
    const dayIdx = headers.findIndex(h => h === 'dia' || h === 'date' || h === 'day');
    const costIdx = headers.findIndex(h => h.includes('custo') || h.includes('cost'));
    const clicksIdx = headers.findIndex(h => h.includes('intera') || h.includes('click') || h.includes('clique'));
    const impressionsIdx = headers.findIndex(h => h.includes('impr') || h.includes('impression'));

    if (dayIdx === -1 || costIdx === -1) {
      return NextResponse.json({
        error: 'Colunas obrigatórias não encontradas. Certifique que o CSV tem: Dia, Custo',
        headers,
      }, { status: 400 });
    }

    // Agregar por mês e manter base diária para filtros de 7/14/30 dias
    const monthMap = new Map<string, { year: number; month: string; spend: number; clicks: number; impressions: number; conversions: number; days: number }>();
    const daily: Array<{ date: string; spend: number; clicks: number; impressions: number; conversions: number }> = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('Total') || line.startsWith('total')) continue;

      const cols = line.split(',');
      if (cols.length < 2) continue;

      const dayStr = cols[dayIdx]?.replace(/"/g, '').trim();
      if (!dayStr || !dayStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

      const [year, month] = dayStr.split('-').map(Number);
      const monthName = MONTH_MAP[month] || `mês-${month}`;
      const key = `${year}-${String(month).padStart(2, '0')}`;

      const spend = parseNumber(cols[costIdx] || '0');
      const clicks = clicksIdx >= 0 ? parseNumber(cols[clicksIdx] || '0') : 0;
      const impressions = impressionsIdx >= 0 ? parseNumber(cols[impressionsIdx] || '0') : 0;

      daily.push({
        date: dayStr,
        spend,
        clicks,
        impressions,
        conversions: 0,
      });

      const existing = monthMap.get(key) || { year, month: monthName, spend: 0, clicks: 0, impressions: 0, conversions: 0, days: 0 };
      monthMap.set(key, {
        ...existing,
        spend: existing.spend + spend,
        clicks: existing.clicks + clicks,
        impressions: existing.impressions + impressions,
        conversions: 0,
        days: existing.days + 1,
      });
    }

    if (monthMap.size === 0) {
      return NextResponse.json({ error: 'Nenhum dado encontrado no CSV' }, { status: 400 });
    }

    const months = Array.from(monthMap.values())
      .sort((a, b) => {
        const aKey = `${a.year}-${Object.values(MONTH_MAP).indexOf(a.month) + 1}`;
        const bKey = `${b.year}-${Object.values(MONTH_MAP).indexOf(b.month) + 1}`;
        return aKey.localeCompare(bKey);
      })
      .map(({ days, ...m }) => m);

    const totalSpend = months.reduce((s, m) => s + m.spend, 0);
    const totalClicks = months.reduce((s, m) => s + m.clicks, 0);
    const totalImpressions = months.reduce((s, m) => s + m.impressions, 0);

    const googleAdsData = {
      updatedAt: new Date().toISOString(),
      customerId: '169-854-9372',
      accountName: 'Vai Pro Mundo',
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions: 0,
      months,
      campaigns: [],
      daily,
      dailyCampaigns: [],
    };

    // Salvar no store
    await setGoogleAdsStoredData(googleAdsData);
    await setSourceControls({ googleAdsEnabled: true });

    return NextResponse.json({
      message: `Google Ads importado: ${months.length} ${months.length === 1 ? 'mês' : 'meses'}`,
      monthsCount: months.length,
      totalSpend: totalSpend.toFixed(2),
      totalClicks,
      totalImpressions,
      months: months.map(m => `${m.month}/${m.year}: R$${m.spend.toFixed(2)}`),
    });
  } catch (error) {
    console.error('Erro ao processar CSV do Google Ads:', error);
    return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 500 });
  }
}
