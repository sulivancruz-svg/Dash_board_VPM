// src/lib/corporate/sync.ts
import { env } from '@/env';
import { prisma } from '@/lib/db';
import type { CorporateSale } from '@prisma/client';

interface SheetRow {
  'Venda Nº': string;
  'Data Venda': string;
  'Vendedor': string;
  'Pagante': string;
  'Produto': string;
  'Fornecedor': string;
  'Data Início': string;
  'Data Fim': string;
  'Destino': string;
  'Tipo Pessoa': string;
  'Situação': string;
  'Receitas': string;
  'Faturamento': string;
}

function parseBrDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

function parseBrMoney(moneyStr: string): number {
  return parseFloat(moneyStr.replace(/\./g, '').replace(',', '.'));
}

function classifyProfile(leadTimeDays: number): string {
  if (leadTimeDays <= 7) return 'Urgente';
  if (leadTimeDays <= 30) return 'Normal';
  return 'Planejado';
}

export async function fetchAndSyncCorporateSales(): Promise<{
  imported: number;
  updated: number;
  error?: string;
}> {
  try {
    // Fetch CSV
    const url = `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEETS_CORPORATE_ID}/export?format=csv&gid=${env.GOOGLE_SHEETS_CORPORATE_GID}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);

    const csv = await res.text();
    const lines = csv.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    const sales: Omit<CorporateSale, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = values[idx] || ''));

      const saleDate = parseBrDate(row['Data Venda']);
      const startDate = parseBrDate(row['Data Início']);
      const leadTimeDays = Math.floor((startDate.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));

      sales.push({
        saleNumber: row['Venda Nº'],
        saleDate,
        seller: row['Vendedor'],
        client: row['Pagante'],
        product: row['Produto'],
        supplier: row['Fornecedor'],
        startDate,
        endDate: parseBrDate(row['Data Fim']),
        destination: row['Destino'],
        personType: row['Tipo Pessoa'],
        status: row['Situação'],
        revenue: parseBrMoney(row['Receitas']),
        billing: parseBrMoney(row['Faturamento']),
        leadTimeDays,
        profile: classifyProfile(leadTimeDays),
      });
    }

    // Upsert to Postgres
    const result = await prisma.corporateSale.createMany({
      data: sales,
      skipDuplicates: true,
    });

    return { imported: result.count, updated: 0 };
  } catch (error) {
    return { imported: 0, updated: 0, error: String(error) };
  }
}

export { parseBrDate, parseBrMoney, classifyProfile };
