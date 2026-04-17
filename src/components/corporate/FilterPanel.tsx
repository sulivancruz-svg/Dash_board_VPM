'use client';
import { useState } from 'react';

interface FilterPanelProps {
  onFiltersChange?: (filters: Record<string, string>) => void;
}

export function FilterPanel({ onFiltersChange }: FilterPanelProps) {
  const [filters, setFilters] = useState({ seller: '', client: '', product: '', startDate: '', endDate: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const updated = { ...filters, [e.target.name]: e.target.value };
    setFilters(updated);
    onFiltersChange?.(updated);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Vendedor</label>
        <input
          type="text"
          name="seller"
          value={filters.seller}
          onChange={handleChange}
          placeholder="Filtrar..."
          className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Cliente</label>
        <input
          type="text"
          name="client"
          value={filters.client}
          onChange={handleChange}
          placeholder="Filtrar..."
          className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Produto</label>
        <input
          type="text"
          name="product"
          value={filters.product}
          onChange={handleChange}
          placeholder="Filtrar..."
          className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">De</label>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Até</label>
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>
    </div>
  );
}
