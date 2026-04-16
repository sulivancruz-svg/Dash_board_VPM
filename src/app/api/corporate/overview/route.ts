import { NextRequest, NextResponse } from 'next/server';
import {
  getCorporateSalesData,
  getCorporateSalesHistory,
} from '@/lib/corporate-sales-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MonthlyPoint {
  month: string; // YYYY-MM
  label: string;
  receitas: number;
  faturamento: number;
  vendas: number;
}

interface BreakdownRow {
  key: string;
  receitas: number;
  faturamento: number;
  vendas: number;
  ticketMedio: number;
}

export async function GET(_req: NextRequest) {
  const data = await getCorporateSalesData();

  if (!data) {
    return NextResponse.json({
      connected: false,
      updatedAt: null,
      totals: null,
      monthly: [],
      topSellers: [],
      topClients: [],
      products: [],
      profiles: [],
      history: [],
    });
  }

  // ───────── Totais ─────────
  let totalReceitas = 0;
  let totalFaturamento = 0;
  const sellers: Record<string, BreakdownRow> = {};
  const clients: Record<string, BreakdownRow> = {};
  const products: Record<string, BreakdownRow> = {};
  const profiles: Record<string, { vendas: number; receitas: number }> = {};
  const monthlyMap: Record<string, MonthlyPoint> = {};

  for (const sale of data.sales) {
    totalReceitas += sale.receitas;
    totalFaturamento += sale.faturamento;

    addToBreakdown(sellers, sale.vendedor || 'Desconhecido', sale);
    addToBreakdown(clients, sale.clienteGrupo || sale.cliente || 'Desconhecido', sale);
    addToBreakdown(products, sale.produto || 'Desconhecido', sale);

    const perfil = sale.perfilCliente || 'Indefinido';
    if (!profiles[perfil]) profiles[perfil] = { vendas: 0, receitas: 0 };
    profiles[perfil].vendas += 1;
    profiles[perfil].receitas += sale.receitas;

    if (sale.dataVenda) {
      const monthKey = sale.dataVenda.slice(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          label: formatMonthLabel(monthKey),
          receitas: 0,
          faturamento: 0,
          vendas: 0,
        };
      }
      monthlyMap[monthKey].receitas += sale.receitas;
      monthlyMap[monthKey].faturamento += sale.faturamento;
      monthlyMap[monthKey].vendas += 1;
    }
  }

  // ───────── Ordenações ─────────
  const topSellers = Object.values(sellers)
    .sort((a, b) => b.receitas - a.receitas);

  const topClients = Object.values(clients)
    .sort((a, b) => b.receitas - a.receitas)
    .slice(0, 15);

  const productsArr = Object.values(products)
    .sort((a, b) => b.receitas - a.receitas);

  const profilesArr = Object.entries(profiles).map(([perfil, v]) => ({
    perfil,
    vendas: v.vendas,
    receitas: v.receitas,
  }));

  const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // ───────── Histórico (último 30 dias de snapshots) ─────────
  const history = (await getCorporateSalesHistory())
    .slice(-30)
    .map((h) => ({
      date: h.date,
      receitas: h.totalReceitas,
      faturamento: h.totalFaturamento,
      vendas: h.totalRecords,
    }));

  // ───────── Crescimento (últimos 30 vs 30 anteriores) ─────────
  const today = new Date();
  const d30 = new Date(today.getTime() - 30 * 86400000);
  const d60 = new Date(today.getTime() - 60 * 86400000);
  let r30 = 0;
  let r60to30 = 0;
  let v30 = 0;
  let v60to30 = 0;
  for (const sale of data.sales) {
    if (!sale.dataVenda) continue;
    const d = new Date(sale.dataVenda);
    if (d >= d30 && d <= today) {
      r30 += sale.receitas;
      v30 += 1;
    } else if (d >= d60 && d < d30) {
      r60to30 += sale.receitas;
      v60to30 += 1;
    }
  }
  const growthReceita = r60to30 > 0 ? ((r30 - r60to30) / r60to30) * 100 : null;
  const growthVendas = v60to30 > 0 ? ((v30 - v60to30) / v60to30) * 100 : null;

  return NextResponse.json({
    connected: true,
    updatedAt: data.updatedAt,
    totals: {
      totalVendas: data.totalRecords,
      totalReceitas,
      totalFaturamento,
      ticketMedioReceita: data.totalRecords > 0 ? totalReceitas / data.totalRecords : 0,
      ticketMedioFaturamento: data.totalRecords > 0 ? totalFaturamento / data.totalRecords : 0,
      vendedoresAtivos: Object.keys(sellers).length,
      clientesAtivos: Object.keys(clients).length,
      growthReceita,
      growthVendas,
    },
    monthly,
    topSellers,
    topClients,
    products: productsArr,
    profiles: profilesArr,
    history,
  });
}

function addToBreakdown(
  target: Record<string, BreakdownRow>,
  key: string,
  sale: { receitas: number; faturamento: number },
) {
  if (!target[key]) {
    target[key] = { key, receitas: 0, faturamento: 0, vendas: 0, ticketMedio: 0 };
  }
  target[key].receitas += sale.receitas;
  target[key].faturamento += sale.faturamento;
  target[key].vendas += 1;
  target[key].ticketMedio = target[key].receitas / target[key].vendas;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mi = parseInt(m, 10) - 1;
  return `${names[mi] || m}/${y.slice(2)}`;
}
