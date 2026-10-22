// server/env.ts
import type { Fetcher, Hyperdrive } from '@cloudflare/workers-types';

export type PublicEnv = {
  HYPERDRIVE: Hyperdrive;
  SITE: Fetcher;
};