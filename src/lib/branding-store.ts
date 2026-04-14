import { blobDeleteFile, blobGetJson, blobSetJson, blobUploadFile } from '@/lib/storage';

export interface BrandingSettings {
  companyName: string;
  logoPath: string | null;  // local path (/branding-assets/...) or Blob URL
  updatedAt: string | null;
}

const DEFAULT_SETTINGS: BrandingSettings = {
  companyName: 'Marketing Dashboard',
  logoPath: null,
  updatedAt: null,
};

async function readStore(): Promise<BrandingSettings> {
  try {
    const parsed = await blobGetJson<Partial<BrandingSettings>>('branding-settings');
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

export async function saveBrandingSettings(input: {
  companyName: string;
  logoBuffer?: Buffer | null;
  logoFileName?: string | null;
  removeLogo?: boolean;
}): Promise<BrandingSettings> {
  const current = await readStore();
  let nextLogoPath = current.logoPath;

  if (input.removeLogo) {
    if (current.logoPath) await blobDeleteFile(current.logoPath);
    nextLogoPath = null;
  }

  if (input.logoBuffer && input.logoFileName) {
    if (current.logoPath) await blobDeleteFile(current.logoPath);

    const ext = input.logoFileName.split('.').pop()?.toLowerCase() || 'png';
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) ? ext : 'png';
    const safeName = `${new Date().toISOString().replace(/[:.]/g, '-')}.${safeExt}`;
    const contentType = safeExt === 'svg' ? 'image/svg+xml' : `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`;

    nextLogoPath = await blobUploadFile(
      `branding-assets/${safeName}`,
      input.logoBuffer,
      contentType,
      'public',
    );
  }

  const nextSettings: BrandingSettings = {
    companyName: input.companyName.trim() || DEFAULT_SETTINGS.companyName,
    logoPath: nextLogoPath,
    updatedAt: new Date().toISOString(),
  };

  await blobSetJson('branding-settings', nextSettings);
  return nextSettings;
}

export async function getBrandingResponse(): Promise<{
  companyName: string;
  logoPath: string | null;
  updatedAt: string | null;
  logoUrl: string | null;
}> {
  const settings = await readStore();
  // Public Vercel Blob URLs can be served directly; local paths go through proxy
  const logoUrl = settings.logoPath
    ? settings.logoPath.startsWith('https://')
      ? settings.logoPath
      : `/api/settings/branding/logo?v=${encodeURIComponent(settings.updatedAt ?? 'logo')}`
    : null;

  return { ...settings, logoUrl };
}
