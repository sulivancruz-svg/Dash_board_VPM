import fs from 'fs';
import path from 'path';

export interface BrandingSettings {
  companyName: string;
  logoPath: string | null;
  updatedAt: string | null;
}

const STORE_FILE = path.join(process.cwd(), '.branding-settings.json');
const BRANDING_DIR = path.join(process.cwd(), 'public', 'branding-assets');

const DEFAULT_SETTINGS: BrandingSettings = {
  companyName: 'Marketing Dashboard',
  logoPath: null,
  updatedAt: null,
};

function ensureBrandingDir() {
  fs.mkdirSync(BRANDING_DIR, { recursive: true });
}

function readStore(): BrandingSettings {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')) as Partial<BrandingSettings>;
    return {
      companyName: parsed.companyName || DEFAULT_SETTINGS.companyName,
      logoPath: parsed.logoPath || null,
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStore(settings: BrandingSettings) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function deleteLogoFileIfManaged(logoPath: string | null) {
  if (!logoPath || !logoPath.startsWith('/branding-assets/')) {
    return;
  }

  const absolutePath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, '').replace(/\//g, path.sep));
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

export function getBrandingSettings(): BrandingSettings {
  return readStore();
}

export function saveBrandingSettings(input: { companyName: string; logoBuffer?: Buffer | null; logoFileName?: string | null; removeLogo?: boolean }): BrandingSettings {
  ensureBrandingDir();

  const current = readStore();
  let nextLogoPath = current.logoPath;

  if (input.removeLogo) {
    deleteLogoFileIfManaged(current.logoPath);
    nextLogoPath = null;
  }

  if (input.logoBuffer && input.logoFileName) {
    deleteLogoFileIfManaged(current.logoPath);

    const originalExt = path.extname(input.logoFileName).toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(originalExt) ? originalExt : '.png';
    const safeName = `${new Date().toISOString().replace(/[:.]/g, '-')}${safeExt}`;
    const filePath = path.join(BRANDING_DIR, safeName);

    fs.writeFileSync(filePath, input.logoBuffer);
    nextLogoPath = `/branding-assets/${safeName}`;
  }

  const nextSettings: BrandingSettings = {
    companyName: input.companyName.trim() || DEFAULT_SETTINGS.companyName,
    logoPath: nextLogoPath,
    updatedAt: new Date().toISOString(),
  };

  writeStore(nextSettings);
  return nextSettings;
}

export function getBrandingResponse() {
  const settings = readStore();
  return {
    ...settings,
    logoUrl: settings.logoPath && settings.updatedAt
      ? `/api/settings/branding/logo?v=${encodeURIComponent(settings.updatedAt)}`
      : settings.logoPath,
  };
}
