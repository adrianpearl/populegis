// server/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Hyperdrive } from '@cloudflare/workers-types';
import * as schema from '@populegis/db';
import * as relations from '@populegis/db';

export function createDb(hyperdrive: Hyperdrive) {
  const queryClient = postgres(hyperdrive.connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });
  const db = drizzle(queryClient, { schema: { ...schema, ...relations } });
  return { queryClient, db };
}