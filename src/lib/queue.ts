// src/lib/queue.ts
import Queue from 'bull';
import { env } from '@/env';

export const corporateSyncQueue = new Queue('corporate-sync', {
  redis: {
    host: new URL(env.REDIS_URL).hostname,
    port: parseInt(new URL(env.REDIS_URL).port || '6379'),
    password: new URL(env.REDIS_URL).password,
  },
});
