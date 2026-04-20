// src/jobs/corporate-sync.ts
import { corporateSyncQueue } from '@/lib/queue';
import { fetchAndSyncCorporateSales } from '@/lib/corporate/sync';
import { createDailyCorporateSnapshot, cleanupOldSnapshots } from '@/lib/corporate/snapshots';

corporateSyncQueue.process(async (job) => {
  console.log('[corporate-sync] Starting sync job...');
  const syncResult = await fetchAndSyncCorporateSales();
  if (syncResult.error) {
    throw new Error(syncResult.error);
  }

  // Create snapshot after successful sync
  await createDailyCorporateSnapshot();

  // Cleanup snapshots older than retention period
  await cleanupOldSnapshots();

  console.log(`[corporate-sync] Synced ${syncResult.imported} records`);
  return syncResult;
});

// Schedule job every 24 hours
corporateSyncQueue.add({}, {
  repeat: { every: 24 * 60 * 60 * 1000 }, // 24 hours in ms
  removeOnComplete: { age: 3600 }, // Keep completed job for 1h
});

export { corporateSyncQueue };
