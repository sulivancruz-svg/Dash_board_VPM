import type { CorporateSale, CorporateSalesData } from './corporate-sales-store';

const DEFAULT_SHEET_ID = '1IGELGbij2xDKWvKpX_qnIlCE_PK9Uxf1fctr73Y2JOk';
const DEFAULT_GID = '2124022251';

/**
 * Fetch the corporate sales data from a public Google Sheet by exporting as CSV.
 * No API key or service account needed — only works if the sheet is shared with
 * "Anyone with the link can view".
 */
export async function fetchCorporateSalesFromSheet(
  sheetId: string = DEFAULT_SHEET_ID,
  gid: string = DEFAULT_GID,
): Promise<CorporateSalesData> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch Google Sheet (${res.status}). ` +
      `Make sure the sheet is shared as "Anyone with the link can view".`,
    );
  }

  const csv = await res.text();
  const sales = parseCorporateSalesCsv(csv);

  return {
    updatedAt: new Date().toISOString(),
    source: 'google-sheets',
    sheetId,
    totalRecords: sales.length,
    sales,
  };
}

/**
 * Parse the CSV returned by Google Sheets into CorporateSale rows.
 * Expects columns (Portuguese, in this exact order):
 *   Venda Nº | Data Venda | Vendedor | Pagante | Produto | Fornecedor |
 *   Data Início | Data Fim | Destino | Tipo Pessoa | Situação | Receitas | Faturamento
 */
export function parseCorporateSalesCsv(csv: string): CorporateSale[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];

  // First row is header — detect header position (sometimes sheets have a title row first)
  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map((c) => c.trim().toLowerCase());
  const dataRows = rows.slice(headerIdx + 1);

  const col = (name: string): number => {
    const idx = header.findIndex((h) => h.includes(name));
    return idx;
  };

  const iVenda = col('venda n') >= 0 ? col('venda n') : 0;
  const iData = col('data venda') >= 0 ? col('data venda') : 1;
  const iVendedor = col('vendedor');
  const iPagante = col('pagante');
  const iProduto = col('produto');
  const iFornecedor = col('fornecedor');
  const iDataInicio = col('data início') >= 0 ? col('data início') : col('data inicio');
  const iDataFim = col('data fim');
  const iDestino = col('destino');
  const iTipoPessoa = col('tipo pessoa');
  const iSituacao = col('situação') >= 0 ? col('situação') : col('situacao');
  const iReceitas = col('receitas') >= 0 ? col('receitas') : col('receita');
  const iFaturamento = col('faturamento');

  const sales: CorporateSale[] = [];

  for (const row of dataRows) {
    if (row.every((c) => !c || !c.trim())) continue; // skip empty
    const vendaNumero = parseInt((row[iVenda] || '').trim(), 10);
    if (!Number.isFinite(vendaNumero)) continue;

    const dataVenda = parseBrDate(row[iData]);
    const dataInicio = iDataInicio >= 0 ? parseBrDate(row[iDataInicio]) : null;
    const dataFim = iDataFim >= 0 ? parseBrDate(row[iDataFim]) : null;

    const antecedenciaDias = dataVenda && dataInicio
      ? Math.max(0, Math.round((dataInicio.getTime() - dataVenda.getTime()) / 86400000))
      : null;

    const perfilCliente = classifyProfile(antecedenciaDias);

    const cliente = (row[iPagante] || '').trim();
    const vendedor = (row[iVendedor] || '').trim();

    sales.push({
      vendaNumero,
      dataVenda: dataVenda ? dataVenda.toISOString().slice(0, 10) : '',
      vendedor,
      cliente,
      clienteGrupo: cliente, // grupo == cliente por padrão; pode ser enriquecido depois
      produto: (row[iProduto] || '').trim(),
      fornecedor: (row[iFornecedor] || '').trim(),
      dataInicio: dataInicio ? dataInicio.toISOString().slice(0, 10) : null,
      dataFim: dataFim ? dataFim.toISOString().slice(0, 10) : null,
      destino: iDestino >= 0 ? (row[iDestino] || '').trim() : '',
      tipoPessoa: iTipoPessoa >= 0 ? (row[iTipoPessoa] || '').trim() : '',
      situacao: iSituacao >= 0 ? (row[iSituacao] || '').trim() : '',
      receitas: parseBrMoney(row[iReceitas]),
      faturamento: parseBrMoney(row[iFaturamento]),
      antecedenciaDias,
      perfilCliente,
    });
  }

  return sales;
}

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const joined = rows[i].join('|').toLowerCase();
    if (joined.includes('vendedor') && (joined.includes('receita') || joined.includes('faturamento'))) {
      return i;
    }
  }
  return rows.length > 0 ? 0 : -1;
}

/**
 * Minimal CSV parser that handles quoted fields with commas and escaped quotes.
 */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\r') continue;
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Parses Brazilian-style dates: "DD/MM/YYYY" or "YYYY-MM-DD".
 */
function parseBrDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const str = raw.trim();
  if (!str) return null;

  // ISO
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(str);
  if (iso) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(str);
  if (br) {
    const day = parseInt(br[1], 10);
    const month = parseInt(br[2], 10);
    let year = parseInt(br[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Parses Brazilian-style currency: "R$ 1.234,56" or "1234,56" or "1234.56".
 */
function parseBrMoney(raw: string | undefined): number {
  if (!raw) return 0;
  let str = raw.trim();
  if (!str) return 0;
  // Remove currency symbol and spaces
  str = str.replace(/R\$\s*/gi, '').replace(/\s/g, '');
  // If has both "." and "," -> "." is thousand sep; "," is decimal
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}

function classifyProfile(dias: number | null): 'Urgente' | 'Normal' | 'Planejado' | null {
  if (dias == null) return null;
  if (dias <= 7) return 'Urgente';
  if (dias <= 30) return 'Normal';
  return 'Planejado';
}
