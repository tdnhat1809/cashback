import { resolve } from 'node:path';
import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true' || value === '1') return true;
  if (value.toLowerCase() === 'false' || value === '0') return false;
  return value;
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:8787'),
  DATABASE_PATH: z.string().min(1).default('./storage/hoantienvip.sqlite'),
  WEB_DIST_PATH: z.string().min(1).default('../dist'),
  SEED_DEMO_DATA: envBoolean.optional(),
  SESSION_COOKIE: z.string().min(1).default('hoantienvip_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(720),
  DEV_OTP: z.string().regex(/^\d{6}$/).optional(),
  IP_HASH_PEPPER: z.string().default('development-only-ip-hash-pepper'),
  DATA_ENCRYPTION_KEY: z.string().default('development-only-encryption-key'),
  SHOPEE_AFFILIATE_MODE: z.enum(['disabled', 'dynamic', 'graphql']).default('disabled'),
  SHOPEE_AFFILIATE_ENDPOINT: z.string().url().default('https://open-api.affiliate.shopee.vn/graphql'),
  SHOPEE_AFFILIATE_ID: z.string().default(''),
  SHOPEE_AFFILIATE_APP_ID: z.string().default(''),
  SHOPEE_AFFILIATE_SECRET: z.string().default(''),
  SHOPEE_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  TIKTOK_ADAPTER_MODE: z.enum(['mock']).default('mock'),
  RIOHUB_BASE_URL: z.string().url().default('https://riohub.vn/api/v1'),
  RIOHUB_API_KEY: z.string().default(''),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env) => {
  const parsed = schema.parse(environment);
  if (parsed.NODE_ENV === 'production') {
    if (parsed.DEV_OTP) throw new Error('DEV_OTP must not be configured in production.');
    if (parsed.IP_HASH_PEPPER.length < 32) throw new Error('IP_HASH_PEPPER must contain at least 32 characters in production.');
    if (parsed.DATA_ENCRYPTION_KEY.length < 32) throw new Error('DATA_ENCRYPTION_KEY must contain at least 32 characters in production.');
  }
  const devOtp = parsed.NODE_ENV === 'production' ? undefined : (parsed.DEV_OTP ?? '123456');
  return {
    ...parsed,
    DEV_OTP: devOtp,
    SEED_DEMO_DATA: parsed.SEED_DEMO_DATA ?? parsed.NODE_ENV !== 'production',
    DATABASE_PATH: parsed.DATABASE_PATH === ':memory:' ? ':memory:' : resolve(process.cwd(), parsed.DATABASE_PATH),
    WEB_DIST_PATH: resolve(process.cwd(), parsed.WEB_DIST_PATH),
  };
};
