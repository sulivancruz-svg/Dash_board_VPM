'use client';

interface Column {
  key: string;
  label: string;
  format?: 'currency' | 'date' | 'text';
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column[];
  data: T[];
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalPages?: number;
}

export function DataTable<T extends Record<string, unknown>>({ columns, data, onPageChange, currentPage = 1, totalPages = 1 }: DataTableProps<T>) {
  const formatValue = (value: unknown, format?: string) => {
    if (format === 'currency') return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (format === 'date') return new Date(String(value)).toLocaleDateString('pt-BR');
    return String(value);
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/25">
              {columns.map(col => (
                <th key={col.key} className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {data.map((row, idx) => (
              <tr key={String(row.id)} className="hover:bg-slate-700/30 transition-colors duration-150">
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-4 text-sm text-slate-200">
                    {formatValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 p-5 border-t border-slate-700/50 bg-slate-800/30">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => onPageChange?.(page)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                page === currentPage
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
