'use client';

import React from 'react';

export interface FunnelRow {
  channel: string;
  leads: number;
  sdrReceived: number;
  qualified: number;
  qualificationRate: number;
  opportunities: number;
  sales: number;
  revenue: number;
  ticket: number;
}

interface FunnelTableProps {
  data: FunnelRow[];
  title?: string;
}

const fmt = new Intl.NumberFormat('pt-BR');
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const qualColor = (rate: number) => {
  if (rate >= 25) return 'text-emerald-600 font-semibold';
  if (rate >= 15) return 'text-amber-600 font-semibold';
  return 'text-red-500 font-semibold';
};

export function FunnelTable({ data }: FunnelTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-700">Canal</th>
              <th className="text-right px-4 py-3.5 font-semibold text-slate-500">Leads</th>
              <th className="text-right px-4 py-3.5 font-semibold text-slate-500">Qualif.</th>
              <th className="text-right px-4 py-3.5 font-semibold text-slate-500">% Qualif.</th>
              <th className="text-right px-4 py-3.5 font-semibold text-slate-500">Oprtun.</th>
              <th className="text-right px-4 py-3.5 font-semibold text-slate-500">Vendas</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-700">Receita</th>
              <th className="text-right px-5 py-3.5 font-semibold text-slate-700">Ticket Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="font-medium text-slate-800">{row.channel}</span>
                </td>
                <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{fmt.format(row.leads)}</td>
                <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{fmt.format(row.qualified)}</td>
                <td className={`px-4 py-3.5 text-right tabular-nums ${qualColor(row.qualificationRate)}`}>
                  {row.qualificationRate.toFixed(1)}%
                </td>
                <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{fmt.format(row.opportunities)}</td>
                <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{fmt.format(row.sales)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">{fmtBRL(row.revenue)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">{fmtBRL(row.ticket)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
