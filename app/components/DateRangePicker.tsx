'use client';

import React, { useEffect, useState } from 'react';
import { toDateInputValue, writeBrowserDateRange } from '@/lib/date-range';

interface DateRangePickerProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

export function DateRangePicker({ onDateChange, defaultStartDate, defaultEndDate }: DateRangePickerProps) {
  const endDate = defaultEndDate || new Date();
  const startDate = defaultStartDate || new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());

  const [localStartDate, setLocalStartDate] = useState(toDateInputValue(startDate));
  const [localEndDate, setLocalEndDate] = useState(toDateInputValue(endDate));

  useEffect(() => {
    setLocalStartDate(toDateInputValue(startDate));
    setLocalEndDate(toDateInputValue(endDate));
  }, [startDate, endDate]);

  const handleApply = () => {
    const start = new Date(`${localStartDate}T00:00:00`);
    const end = new Date(`${localEndDate}T00:00:00`);
    writeBrowserDateRange(start, end);
    onDateChange(start, end);
  };

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    setLocalStartDate(toDateInputValue(start));
    setLocalEndDate(toDateInputValue(end));
    writeBrowserDateRange(start, end);
    onDateChange(start, end);
  };

  return (
    <div className="space-y-4 rounded border border-cyan-400/15 bg-[#0B2440] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-cyan-100/70">Data Inicial</label>
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            className="w-full rounded border border-cyan-400/20 bg-[#07182D] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-cyan-100/70">Data Final</label>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            className="w-full rounded border border-cyan-400/20 bg-[#07182D] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => handlePreset(7)} className="rounded bg-white/10 px-3 py-2 text-sm text-cyan-50 transition-colors hover:bg-white/15">
          Últimos 7 dias
        </button>
        <button onClick={() => handlePreset(30)} className="rounded bg-white/10 px-3 py-2 text-sm text-cyan-50 transition-colors hover:bg-white/15">
          Últimos 30 dias
        </button>
        <button onClick={() => handlePreset(90)} className="rounded bg-white/10 px-3 py-2 text-sm text-cyan-50 transition-colors hover:bg-white/15">
          Últimos 90 dias
        </button>
        <button onClick={handleApply} className="ml-auto rounded bg-emerald-400 px-4 py-2 text-sm font-bold text-[#061427] transition-colors hover:bg-emerald-300">
          Aplicar
        </button>
      </div>
    </div>
  );
}
