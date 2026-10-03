// server/index.ts
import type { ExportedHandler, Fetcher, HTMLRewriter as CFHTMLRewriter, Response as CFResponse, Hyperdrive } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc } from 'drizzle-orm';

import { bills } from '../src/db/schema';
import * as schema from '../src/db/schema';
import * as relations from '../src/db/relations';

const BOT_AGENTS = ['applebot', 'facebot', 'facebookexternalhit', 'twitterbot', 'slackbot', 'discordbot'];

interface Env {
  HYPERDRIVE: Hyperdrive;
  ASSETS: Fetcher;
}

function createDb(env: Env) {
  const queryClient = postgres(env.HYPERDRIVE.connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });
  const db = drizzle(queryClient, { schema: { ...schema, ...relations } });
  return { queryClient, db };
}

export default {
  async fetch(request, env, ctx) {
    const url = new (globalThis as any).URL(request.url);
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

    const match = url.pathname.match(/^\/item\/([^/]+)/);
    if (match && BOT_AGENTS.some((bot) => userAgent.includes(bot))) {
      const packageId = match[1];
      const { queryClient, db } = createDb(env);

      try {
        const item = await db.query.bills.findFirst({
          where: eq(bills.packageid, packageId),
        });

        if (!item) return env.ASSETS.fetch(request) as unknown as CFResponse;

        const assetResponse = await env.ASSETS.fetch(request);
        return (new (globalThis as any).HTMLRewriter() as CFHTMLRewriter)
          .on('head', {
            element(el) {
              const titleText = item.shortTitle || item.officialTitle;
              el.append(`<meta property="og:title" content="${titleText}" />`, { html: true });
              const descText = item.version ? `Version: ${item.version}` : 'Legislative tracking overview.';
              el.append(`<meta property="og:description" content="${descText}" />`, { html: true });
              el.append(`<meta property="og:type" content="website" />`, { html: true });
              el.append(`<meta name="twitter:card" content="summary_large_image" />`, { html: true });
            },
          })
          .transform(assetResponse) as unknown as CFResponse;
      } catch {
        return env.ASSETS.fetch(request) as unknown as CFResponse;
      } finally {
        ctx.waitUntil(queryClient.end());
      }
    }

    if (url.pathname === '/api/bills') {
      const { queryClient, db } = createDb(env);

      try {
        const latestBills = await db.query.bills.findMany({
          limit: 10,
          orderBy: [desc(bills.dateIssued)],
          with: {
            tags: true,
            comments: true,
          },
        });

        return new (globalThis as any).Response(JSON.stringify(latestBills), {
          headers: { 'Content-Type': 'application/json' },
        }) as unknown as CFResponse;
      } catch (err: any) {
        return new (globalThis as any).Response(JSON.stringify({
          error: 'Database query failed',
          details: err.message,
          stack: err.stack,
        }), { status: 500 }) as unknown as CFResponse;
      } finally {
        ctx.waitUntil(queryClient.end());
      }
    }

    return env.ASSETS.fetch(request) as unknown as CFResponse;
  },
} satisfies ExportedHandler<Env>;