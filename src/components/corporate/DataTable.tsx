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
          {data.map((row) => (
            <tr key={String(row.id)} className="border-b hover:bg-gray-50">
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
