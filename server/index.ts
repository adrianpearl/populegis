// server/index.ts
import type { Fetcher, HTMLRewriter as CFHTMLRewriter, Response as CFResponse, Hyperdrive } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { bills } from '../src/db/schema';
import { createDb } from './db';
import { publicApi } from './routes/public';
import { govinfo } from './routes/govinfo';

interface Env {
  HYPERDRIVE: Hyperdrive;
  GOVINFO_API_KEY: string;
  ASSETS: Fetcher;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');
app.route('/', publicApi);
app.route('/admin/govinfo', govinfo);

const BOT_AGENTS = ['applebot', 'facebot', 'facebookexternalhit', 'twitterbot', 'slackbot', 'discordbot'];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const match = url.pathname.match(/^\/item\/([^/]+)/);

    if (match && BOT_AGENTS.some((bot) => userAgent.includes(bot))) {
      const { queryClient, db } = createDb(env.HYPERDRIVE);
      try {
        const item = await db.query.bills.findFirst({ where: eq(bills.packageid, match[1]) });
        if (!item) return env.ASSETS.fetch(request) as unknown as CFResponse;
        const assetResponse = await env.ASSETS.fetch(request);
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
        return env.ASSETS.fetch(request) as unknown as CFResponse;
      } finally {
        ctx.waitUntil(queryClient.end());
      }
    }

    if (url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    return env.ASSETS.fetch(request) as unknown as CFResponse;
  },
};