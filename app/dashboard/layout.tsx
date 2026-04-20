import { Navigation } from '@/components/Navigation';
import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07182D] text-slate-100">
      <Navigation />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#12345B_0,#07182D_42%,#051121_100%)]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
