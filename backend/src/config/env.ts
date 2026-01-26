import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DB_HOST: z.string(),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),

  SYNC_INTERVAL_MINUTES: z.string().default('10'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: parseInt(parsed.data.PORT, 10),
  host: parsed.data.HOST,
  nodeEnv: parsed.data.NODE_ENV,

  db: {
    host: parsed.data.DB_HOST,
    port: parseInt(parsed.data.DB_PORT, 10),
    database: parsed.data.DB_NAME,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
  },

  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
    refreshExpiresIn: parsed.data.REFRESH_TOKEN_EXPIRES_IN,
  },

  google: {
    serviceAccountEmail: parsed.data.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: parsed.data.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },

  syncIntervalMinutes: parseInt(parsed.data.SYNC_INTERVAL_MINUTES, 10),
};
