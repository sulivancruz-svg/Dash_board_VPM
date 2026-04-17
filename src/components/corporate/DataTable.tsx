'use client';
import { useState } from 'react';

interface Column {
  key: string;
  label: string;
  format?: 'currency' | 'date' | 'text';
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, any>[];
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalPages?: number;
}

export function DataTable({ columns, data, onPageChange, currentPage = 1, totalPages = 1 }: DataTableProps) {
  const formatValue = (value: any, format?: string) => {
    if (format === 'currency') return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (format === 'date') return new Date(value).toLocaleDateString('pt-BR');
    return String(value);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className="px-6 py-4 text-sm text-gray-700">
                  {formatValue(row[col.key], col.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => onPageChange?.(page)}
              className={`px-3 py-1 rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
