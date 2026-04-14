import { kvGet, kvSet } from '@/lib/storage';

export interface BrandingSettings {
  companyName: string;
  logoPath: string | null;
  updatedAt: string | null;
}

// Logo stored separately as base64 in KV to avoid Vercel Blob dependency
interface LogoData {
  base64: string;
  contentType: string;
}

const DEFAULT_SETTINGS: BrandingSettings = {
  companyName: 'Marketing Dashboard',
  logoPath: null,
  updatedAt: null,
};

const KV_SETTINGS = 'branding-settings';
const KV_LOGO = 'branding-logo';

async function readStore(): Promise<BrandingSettings> {
  try {
    const parsed = await kvGet<Partial<BrandingSettings>>(KV_SETTINGS);
    if (!parsed) return DEFAULT_SETTINGS;
    return {
      companyName: parsed.companyName || DEFAULT_SETTINGS.companyName,
      logoPath: parsed.logoPath || null,
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getBrandingSettings(): Promise<BrandingSettings> {
  return readStore();
}

export async function getLogoData(): Promise<LogoData | null> {
  try {
    return await kvGet<LogoData>(KV_LOGO);
  } catch {
    return null;
  }
}

export async function saveBrandingSettings(input: {
  companyName: string;
  logoBuffer?: Buffer | null;
  logoFileName?: string | null;
  removeLogo?: boolean;
}): Promise<BrandingSettings> {
  const current = await readStore();
  let hasLogo = !!current.logoPath;

  if (input.removeLogo) {
    try { await kvSet(KV_LOGO, null); } catch { /* ignore */ }
    hasLogo = false;
  }

  if (input.logoBuffer && input.logoFileName) {
    const ext = input.logoFileName.split('.').pop()?.toLowerCase() || 'png';
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) ? ext : 'png';
    const contentType = safeExt === 'svg' ? 'image/svg+xml' : `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`;

    const logoData: LogoData = {
      base64: input.logoBuffer.toString('base64'),
      contentType,
    };
    await kvSet(KV_LOGO, logoData);
    hasLogo = true;
  }

  const nextSettings: BrandingSettings = {
    companyName: input.companyName.trim() || DEFAULT_SETTINGS.companyName,
    logoPath: hasLogo ? 'kv' : null,   // 'kv' = logo stored in KV
    updatedAt: new Date().toISOString(),
  };

  await kvSet(KV_SETTINGS, nextSettings);
  return nextSettings;
}

export async function getBrandingResponse(): Promise<{
  companyName: string;
  logoPath: string | null;
  updatedAt: string | null;
  logoUrl: string | null;
}> {
  const settings = await readStore();
  const logoUrl = settings.logoPath
    ? `/api/settings/branding/logo?v=${encodeURIComponent(settings.updatedAt ?? 'logo')}`
    : null;

  return { ...settings, logoUrl };
}
