import { blobGetJson, blobSetJson } from '@/lib/storage';

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

export async function getSourceControls(): Promise<SourceControls> {
  try {
    const parsed = await blobGetJson<Partial<SourceControls>>('source-controls');
    if (!parsed) return DEFAULT_SOURCE_CONTROLS;
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

export async function setSourceControls(
  nextControls: Partial<SourceControls>,
): Promise<SourceControls> {
  const current = await getSourceControls();
  const merged: SourceControls = { ...current, ...nextControls };
  await blobSetJson('source-controls', merged);
  return merged;
}
