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
    <div className="bg-[#0B2440] border border-cyan-400/15 rounded shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
      {title && <h3 className="text-lg font-bold text-white p-5 border-b border-cyan-400/15">{title}</h3>}
      <div style={{ maxHeight, overflowY: 'auto' }} className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#061427] border-b border-cyan-400/15 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-5 py-3 text-left text-xs font-bold text-cyan-100/70 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-400/10">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/[0.04] transition-colors">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-5 py-4 text-sm text-cyan-50">
                    {col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <div className="text-center py-8 text-cyan-100/60">Nenhum dado disponível</div>}
      </div>
    </div>
  );
}
