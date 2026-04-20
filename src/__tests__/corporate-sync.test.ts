// src/__tests__/corporate-sync.test.ts

// Mock env and prisma so the module can be imported without real credentials
jest.mock('@/env', () => ({
  env: {
    GOOGLE_SHEETS_CORPORATE_ID: 'test-sheet-id',
    GOOGLE_SHEETS_CORPORATE_GID: '0',
  },
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    corporateSale: {
      createMany: jest.fn(),
    },
  },
}));

import { parseBrDate, parseBrMoney, classifyProfile } from '@/lib/corporate/sync';

describe('corporate sync parsing', () => {
  it('parses Brazilian dates correctly', () => {
    const date = parseBrDate('15/04/2026');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3); // 0-indexed April is month 3
    expect(date.getDate()).toBe(15);
  });

  it('parses another date', () => {
    const date = parseBrDate('01/01/2026');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0); // January
    expect(date.getDate()).toBe(1);
  });

  it('parses Brazilian money with thousands separator', () => {
    expect(parseBrMoney('1.234,56')).toBeCloseTo(1234.56, 2);
  });

  it('parses Brazilian money without thousands separator', () => {
    expect(parseBrMoney('100,00')).toBeCloseTo(100, 2);
  });

  it('parses large Brazilian money amounts', () => {
    expect(parseBrMoney('1.000.000,00')).toBeCloseTo(1000000, 2);
  });

  it('classifies profiles by lead time', () => {
    expect(classifyProfile(5)).toBe('Urgente');
    expect(classifyProfile(7)).toBe('Urgente');
    expect(classifyProfile(15)).toBe('Normal');
    expect(classifyProfile(30)).toBe('Normal');
    expect(classifyProfile(31)).toBe('Planejado');
    expect(classifyProfile(60)).toBe('Planejado');
  });
});
