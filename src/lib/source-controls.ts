import fs from 'fs';
import path from 'path';

const SOURCE_CONTROLS_FILE = path.join(process.cwd(), '.source-controls.json');

export interface SourceControls {
  sdrEnabled: boolean;
  pipedriveEnabled: boolean;
  googleAdsEnabled: boolean;
}

const DEFAULT_SOURCE_CONTROLS: SourceControls = {
  sdrEnabled: true,
  pipedriveEnabled: true,
  googleAdsEnabled: true,
};

export function getSourceControls(): SourceControls {
  try {
    if (!fs.existsSync(SOURCE_CONTROLS_FILE)) {
      return DEFAULT_SOURCE_CONTROLS;
    }

    const parsed = JSON.parse(fs.readFileSync(SOURCE_CONTROLS_FILE, 'utf-8')) as Partial<SourceControls>;

    return {
      sdrEnabled: parsed.sdrEnabled ?? true,
      pipedriveEnabled: parsed.pipedriveEnabled ?? true,
      googleAdsEnabled: parsed.googleAdsEnabled ?? true,
    };
  } catch (error) {
    console.error('Error reading source controls:', error);
    return DEFAULT_SOURCE_CONTROLS;
  }
}

export function setSourceControls(nextControls: Partial<SourceControls>): SourceControls {
  const current = getSourceControls();
  const merged: SourceControls = {
    ...current,
    ...nextControls,
  };

  try {
    fs.writeFileSync(SOURCE_CONTROLS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving source controls:', error);
    throw error;
  }

  return merged;
}
