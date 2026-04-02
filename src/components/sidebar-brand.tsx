'use client';

import { useEffect, useState } from 'react';
import { BRANDING_EVENT_NAME } from '@/lib/branding-events';

interface BrandingResponse {
  companyName: string;
  logoPath: string | null;
  logoUrl: string | null;
  updatedAt: string | null;
}

const DEFAULT_BRANDING: BrandingResponse = {
  companyName: 'Marketing Dashboard',
  logoPath: null,
  logoUrl: null,
  updatedAt: null,
};

function getInitials(companyName: string) {
  const parts = companyName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'M';
}

export function SidebarBrand() {
  const [branding, setBranding] = useState<BrandingResponse>(DEFAULT_BRANDING);

  useEffect(() => {
    const loadBranding = () => {
      fetch('/api/settings/branding', { cache: 'no-store' })
        .then((response) => response.ok ? response.json() : DEFAULT_BRANDING)
        .then((payload) => setBranding(payload))
        .catch(() => setBranding(DEFAULT_BRANDING));
    };

    loadBranding();
    window.addEventListener(BRANDING_EVENT_NAME, loadBranding);
    return () => window.removeEventListener(BRANDING_EVENT_NAME, loadBranding);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={branding.companyName}
          className="h-10 w-10 rounded-lg border border-slate-700/60 bg-white object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">
          {getInitials(branding.companyName)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-white">{branding.companyName}</p>
        <p className="text-xs text-slate-400">Dashboard</p>
      </div>
    </div>
  );
}
