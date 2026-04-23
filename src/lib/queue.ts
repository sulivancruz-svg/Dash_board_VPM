// src/lib/queue.ts
import Bull from 'bull';

let _queue: Bull.Queue | null = null;

export function getCorporateSyncQueue(): Bull.Queue {
  if (!_queue) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL not configured');
    const url = new URL(redisUrl);
    _queue = new Bull('corporate-sync', {
      redis: {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
      },
    });
    console.log('[jobs] Corporate sync queue initialized');
  }
  return _queue;
}
