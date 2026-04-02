import * as XLSX from 'xlsx';

export interface SdrSummaryRow {
  monthName: string;
  year?: number;
  leadsTotal: number;
  leadsQualified: number;
  dealsClosed: number;
}

export interface SdrDealRow {
  clientName: string | null;
  channelRaw: string | null;
  monthEntered: string | null;
  monthClosed: string | null;
  monthTrip: string | null;
  dealValue: number | null;
  flags: string[];
}

const MONTH_NAMES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export function parseMonthName(str: string | null | undefined): string | null {
  if (!str) return null;
  const clean = String(str).toLowerCase().trim().split('/')[0];
  return clean.length > 0 ? clean : null;
}

export function monthNameToNumber(str: string | null | undefined): number | null {
  if (!str) return null;
  const normalized = parseMonthName(str);
  if (!normalized) return null;
  return MONTH_NAMES[normalized] ?? null;
}

export function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  // Se já for número (Excel numeric), usa direto
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const str = String(value).replace(/[R$\s]/g, '').trim();
  // Formato brasileiro: "10.133,12" → tem vírgula como decimal
  if (str.includes(',')) {
    const normalized = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }
  // Sem vírgula: pode ser "10133.12" (decimal inglês) ou "10133" (inteiro)
  const num = parseFloat(str.replace(/\./g, ''));
  // Se o original tinha apenas um ponto (decimal), preservar
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount === 1) {
    const direct = parseFloat(str);
    return isNaN(direct) ? null : direct;
  }
  return isNaN(num) ? null : num;
}

export function parseSdrExcel(buffer: Buffer): { summary: SdrSummaryRow[]; deals: SdrDealRow[] } {
  const workbook = XLSX.read(buffer, { cellFormula: false });

  // Processa APENAS a aba com o ano mais recente (2026)
  const allSummary: SdrSummaryRow[] = [];
  const allDeals: SdrDealRow[] = [];

  // Encontrar o ano mais recente disponível
  const years = workbook.SheetNames
    .map(name => /^\d{4}$/.test(name.trim()) ? parseInt(name.trim()) : null)
    .filter(y => y !== null) as number[];

  const latestYear = years.length > 0 ? Math.max(...years) : undefined;

  for (const sheetName of workbook.SheetNames) {
    const sheetYear = /^\d{4}$/.test(sheetName.trim()) ? parseInt(sheetName.trim()) : undefined;

    // Importar apenas a aba do ano mais recente
    if (sheetYear && sheetYear !== latestYear) continue;

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    // SEÇÃO 1: Resumo mensal (procura header "Mês")
    const summaryHeaderIdx = rows.findIndex(
      row => row[0] && String(row[0]).toLowerCase().includes('mês') && row[1] && row[2] && row[3]
    );

    if (summaryHeaderIdx >= 0) {
      for (let i = summaryHeaderIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0] || !row[1] || typeof row[1] !== 'number') break;

        allSummary.push({
          monthName: String(row[0]).trim(),
          year: sheetYear,
          leadsTotal: Number(row[1]) || 0,
          leadsQualified: Number(row[2]) || 0,
          dealsClosed: Number(row[3]) || 0,
        });
      }
    }

    // SEÇÃO 2: Detalhe de vendas (procura header "Cliente")
    const detailHeaderIdx = rows.findIndex(
      row => row[0] && String(row[0]).toLowerCase() === 'cliente'
    );

    if (detailHeaderIdx >= 0) {
      for (let i = detailHeaderIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0]) continue;
        if (isNaN(Number(row[0])) === false && row[0] !== '') continue; // pula totais

        const flags: string[] = [];
        const channelRaw = row[1] ? String(row[1]).trim() : null;

        // Detectar coluna de valor: pode ser row[4] (5 colunas) ou row[5] (6 colunas)
        const valueCol = row.length === 5 || !row[5] ? 4 : 5;
        const dealValue = parseCurrency(row[valueCol]);

        if (!channelRaw) flags.push('MISSING_CHANNEL');
        if (dealValue === null && row[valueCol]) flags.push('INVALID_VALUE');

        allDeals.push({
          clientName: row[0] ? String(row[0]).trim() : null,
          channelRaw,
          monthEntered: parseMonthName(row[2]),
          monthClosed: parseMonthName(row[3]),
          monthTrip: row.length > 5 ? parseMonthName(row[4]) : null,
          dealValue,
          flags,
        });
      }
    }
  }

  return { summary: allSummary, deals: allDeals };
}

export function validateSdrDeal(deal: SdrDealRow): SdrDealRow {
  const flags = [...deal.flags];

  // Validações
  if (!deal.clientName) flags.push('MISSING_CLIENT_NAME');
  if (!deal.channelRaw) flags.push('MISSING_CHANNEL');
  if (deal.dealValue === null && deal.clientName) flags.push('MISSING_VALUE');
  if (deal.dealValue === 0) flags.push('ZERO_VALUE');
  if (deal.dealValue && deal.dealValue > 1000000) flags.push('SUSPICIOUS_VALUE');

  return { ...deal, flags };
}
