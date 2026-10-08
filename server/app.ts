// server/app.ts
import type { HTMLRewriter as CFHTMLRewriter, Response as CFResponse } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { bills } from '../src/db/schema';
import { createDb } from './db';
import { publicApi } from './routes/public';
import type { PublicEnv } from './env';

export const api = new Hono<{ Bindings: PublicEnv }>().basePath('/api');
api.route('/', publicApi);

const BOT_AGENTS = ['applebot', 'facebot', 'facebookexternalhit', 'twitterbot', 'slackbot', 'discordbot'];

export async function handleRequest(request: Request, env: PublicEnv, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const match = url.pathname.match(/^\/item\/([^/]+)/);

  if (match && BOT_AGENTS.some((bot) => userAgent.includes(bot))) {
    const { queryClient, db } = createDb(env.HYPERDRIVE);
    try {
      const item = await db.query.bills.findFirst({ where: eq(bills.packageid, match[1]) });
      if (!item) return env.SITE.fetch(request);
      const assetResponse = await env.SITE.fetch(request);
      return (new HTMLRewriter() as CFHTMLRewriter)
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
      return env.SITE.fetch(request);
    } finally {
      ctx.waitUntil(queryClient.end());
    }
  }

  if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx);
  return env.SITE.fetch(request);
}