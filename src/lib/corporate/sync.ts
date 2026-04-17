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
  return parseFloat(moneyStr.replace('.', '').replace(',', '.'));
}

function classifyProfile(leadTimeDays: number): string {
  if (leadTimeDays <= 7) return 'Urgente';
  if (leadTimeDays <= 30) return 'Normal';
  return 'Planejado';
}

// Helper function to parse CSV line respecting quoted fields (RFC 4180)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote (two quotes in a row)
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Comma outside quotes = field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add final field
  result.push(current.trim());
  return result;
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
    const headerLine = parseCSVLine(lines[0]);
    const headers = headerLine.map(h => h.replace(/^"|"$/g, '').trim()); // Remove surrounding quotes

    const sales: Omit<CorporateSale, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        // Remove surrounding quotes from values if present
        let value = values[idx] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        row[h] = value.trim();
      });

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

    // Upsert to Postgres with batching for large datasets
    const batchSize = 1000;
    let totalImported = 0;

    for (let i = 0; i < sales.length; i += batchSize) {
      const batch = sales.slice(i, i + batchSize);
      const result = await prisma.corporateSale.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalImported += result.count;
    }

    return { imported: totalImported, updated: 0 };
  } catch (error) {
    return { imported: 0, updated: 0, error: String(error) };
  }
}
