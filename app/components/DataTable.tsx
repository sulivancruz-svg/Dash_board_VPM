'use client';

import React from 'react';

interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  title?: string;
  maxHeight?: string;
}

export function DataTable<T>({ data, columns, title, maxHeight = '500px' }: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-lg shadow">
      {title && <h3 className="text-lg font-semibold text-gray-900 p-6 border-b">{title}</h3>}
      <div style={{ maxHeight, overflowY: 'auto' }} className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4 text-sm text-gray-900">
                    {col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
        )}
      </div>
    </div>
  );
}
