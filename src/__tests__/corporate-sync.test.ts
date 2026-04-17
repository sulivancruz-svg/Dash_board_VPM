// RFC 4180 CSV Parser - Unit Tests
// Note: This file uses Jest-style syntax but can be run standalone
const describe = (name: string, fn: () => void) => { console.log(`\nTest Suite: ${name}`); fn(); };
const it = (name: string, fn: () => void) => { try { fn(); console.log(`  ✓ ${name}`); } catch(e) { console.log(`  ✗ ${name}: ${e}`); } };
const expect = (val: any) => ({ toBe: (expected: any) => { if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`); } });

// Helper functions extracted for testing
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

// RFC 4180 CSV parser for testing
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

describe('corporate sync parsing', () => {
  it('parses Brazilian dates', () => {
    const date = parseBrDate('15/04/2026');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3); // 0-indexed
    expect(date.getDate()).toBe(15);
  });

  it('parses Brazilian money', () => {
    expect(parseBrMoney('1.234,56')).toBe(1234.56);
    expect(parseBrMoney('100,00')).toBe(100);
  });

  it('classifies profiles correctly - Urgente', () => {
    expect(classifyProfile(5)).toBe('Urgente');
    expect(classifyProfile(7)).toBe('Urgente');
  });

  it('classifies profiles correctly - Normal', () => {
    expect(classifyProfile(15)).toBe('Normal');
    expect(classifyProfile(30)).toBe('Normal');
  });

  it('classifies profiles correctly - Planejado', () => {
    expect(classifyProfile(31)).toBe('Planejado');
    expect(classifyProfile(60)).toBe('Planejado');
  });
});

describe('RFC 4180 CSV parsing', () => {
  it('parses CSV with quoted fields containing commas', () => {
    const line = '"São Paulo, Brazil",123,456';
    const result = parseCSVLine(line);
    expect(result.length).toBe(3);
    expect(result[0]).toBe('São Paulo, Brazil');
    expect(result[1]).toBe('123');
    expect(result[2]).toBe('456');
  });

  it('handles escaped quotes in quoted fields', () => {
    const line = '"Company ""Inc""",1000';
    const result = parseCSVLine(line);
    expect(result.length).toBe(2);
    expect(result[0]).toBe('Company "Inc"');
    expect(result[1]).toBe('1000');
  });
});
