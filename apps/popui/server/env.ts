// server/env.ts
import type { Fetcher, Hyperdrive } from '@cloudflare/workers-types';

export type PublicEnv = {
  HYPERDRIVE: Hyperdrive;
  SITE: Fetcher;
};

export type AdminEnv = PublicEnv & {
  DB_WRITE: Hyperdrive;
  GOVINFO_API_KEY: string;
};