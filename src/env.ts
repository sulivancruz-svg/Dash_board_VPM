import { z } from 'zod';

const envSchema = z.object({
  // Existing
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  DASHBOARD_PASSWORD: z.string().min(1),

  // New for Corporate
  GOOGLE_SHEETS_CORPORATE_ID: z.string().min(1),
  GOOGLE_SHEETS_CORPORATE_GID: z.string().min(1),
  GOOGLE_SHEETS_API_KEY: z.string().min(1),
  CORPORATE_SYNC_INTERVAL_HOURS: z.coerce.number().int().positive().default(24),
  SNAPSHOT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
});

export const env = envSchema.parse(process.env);
