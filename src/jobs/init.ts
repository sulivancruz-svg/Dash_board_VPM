// src/jobs/init.ts
import { corporateSyncQueue } from './corporate-sync';

export async function initializeJobs() {
  // Ensure processor is registered
  console.log('[jobs] Corporate sync queue initialized');
}
