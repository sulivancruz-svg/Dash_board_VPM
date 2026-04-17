'use client';

import { DateRangeFilter } from '@/components/date-range-filter';
import { useDashboardDateRange } from '@/lib/use-dashboard-date-range';

export default function BrandingPage() {
  const { activePeriod, dateRange, setPresetPeriod, setCustomDateRange } = useDashboardDateRange();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branding & Leitura Estrategica</h1>
          <p className="text-gray-600 mt-2">Proxies de construcao de marca e analise de impacto de longo prazo</p>
        </div>
        <DateRangeFilter
          activePeriod={activePeriod}
          dateRange={dateRange}
          onPresetSelect={setPresetPeriod}
          onRangeChange={setCustomDateRange}
        />
      </div>

      <div className="card">
        <div className="card-body p-12 text-center">
          <p className="text-gray-600">Secao em desenvolvimento</p>
          <p className="text-sm text-gray-500 mt-2">Alcance, frequencia, engajamento e atencao de campanha</p>
        </div>
      </div>
    </div>
  );
}
