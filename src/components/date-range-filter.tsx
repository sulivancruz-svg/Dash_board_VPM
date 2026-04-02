'use client';

interface DateRangeValue {
  start: string;
  end: string;
}

interface DateRangeFilterProps {
  activePeriod: string;
  dateRange: DateRangeValue;
  onPresetSelect: (period: string) => void;
  onRangeChange: (range: DateRangeValue) => void;
}

const PRESET_PERIODS = [
  { label: '7 dias', value: '7' },
  { label: '14 dias', value: '14' },
  { label: '30 dias', value: '30' },
];

export function DateRangeFilter({
  activePeriod,
  dateRange,
  onPresetSelect,
  onRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
        {PRESET_PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => onPresetSelect(period.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activePeriod === period.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => onRangeChange({ ...dateRange, start: e.target.value })}
          className="text-xs font-medium text-slate-600 outline-none"
        />
        <span className="text-xs text-slate-400">ate</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => onRangeChange({ ...dateRange, end: e.target.value })}
          className="text-xs font-medium text-slate-600 outline-none"
        />
      </div>
    </div>
  );
}
