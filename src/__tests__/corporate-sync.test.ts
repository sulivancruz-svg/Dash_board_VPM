import { describe, it, expect } from '@jest/globals';

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
