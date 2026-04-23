import { z } from 'zod';

const envSchema = z.object({
  // Existing
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  DASHBOARD_PASSWORD: z.string().min(1),

  // Corporate (optional — features disabled if not set on Vercel)
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  GOOGLE_SHEETS_CORPORATE_ID: z.string().optional().default(''),
  GOOGLE_SHEETS_CORPORATE_GID: z.string().optional().default(''),
  GOOGLE_SHEETS_API_KEY: z.string().optional().default(''),
  CORPORATE_SYNC_INTERVAL_HOURS: z.coerce.number().int().positive().default(24),
  SNAPSHOT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
});

export const env = envSchema.parse(process.env);
