'use client';

import React, { useState } from 'react';
import { formatDate } from '@/lib/format';

interface DateRangePickerProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

export function DateRangePicker({ onDateChange, defaultStartDate, defaultEndDate }: DateRangePickerProps) {
  const endDate = defaultEndDate || new Date();
  const startDate = defaultStartDate || new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());

  const [localStartDate, setLocalStartDate] = useState(startDate.toISOString().split('T')[0]);
  const [localEndDate, setLocalEndDate] = useState(endDate.toISOString().split('T')[0]);

  const handleApply = () => {
    onDateChange(new Date(localStartDate), new Date(localEndDate));
  };

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    setLocalStartDate(start.toISOString().split('T')[0]);
    setLocalEndDate(end.toISOString().split('T')[0]);
    onDateChange(start, end);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handlePreset(7)}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Últimos 7 dias
        </button>
        <button
          onClick={() => handlePreset(30)}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Últimos 30 dias
        </button>
        <button
          onClick={() => handlePreset(90)}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Últimos 90 dias
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ml-auto"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
