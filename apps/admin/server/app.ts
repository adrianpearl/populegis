// server/app.ts
import type { HTMLRewriter as CFHTMLRewriter, Response as CFResponse } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { bills, provisions } from '@populegis/db';
import { createDb } from './db';
import { publicApi } from './routes/public';
import type { PublicEnv } from './env';

export const api = new Hono<{ Bindings: PublicEnv }>().basePath('/api');
api.route('/', publicApi);

const BOT_AGENTS = ['applebot', 'facebot', 'facebookexternalhit', 'twitterbot', 'slackbot', 'discordbot'];

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export async function handleRequest(request: Request, env: PublicEnv, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const billMatch = url.pathname.match(/^\/bill\/([^/]+)(?:\/(\d+))?\/?$/);
  const botMatch = BOT_AGENTS.some((bot) => userAgent.includes(bot));

  if (billMatch && botMatch) {
    const slug = billMatch[1];
    const location = billMatch[2] ? Number(billMatch[2]) : null;
    const packageid = slug.startsWith('BILLS-') ? slug : `BILLS-${slug}`;
    const { queryClient, db } = createDb(env.HYPERDRIVE);
    try {
      const bill = await db.query.bills.findFirst({ where: eq(bills.packageid, packageid) });
      if (!bill) return env.SITE.fetch(request);

      let title = bill.shortTitle || bill.officialTitle;
      let description = bill.officialTitle;
      if (location != null) {
        const provision = await db.query.provisions.findFirst({
          where: and(eq(provisions.packageid, packageid), eq(provisions.location, location)),
        });
        const header = provision?.header?.replace(/<[^>]+>/g, '').trim();
        const text = provision?.text?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        title = header || text?.slice(0, 80) || title;
        description = text?.slice(0, 200) || header || description;
      }

      const assetResponse = await env.SITE.fetch(request);
      return new HTMLRewriter()
        .on('head', {
          element(el) {
            el.append(`<meta property="og:title" content="${escapeAttr(title)}" />`, { html: true });
            el.append(`<meta property="og:description" content="${escapeAttr(description)}" />`, { html: true });
            el.append(`<meta property="og:type" content="article" />`, { html: true });
            el.append(`<meta name="twitter:card" content="summary" />`, { html: true });
          },
        })
        .transform(assetResponse);
    } catch {
      return env.SITE.fetch(request);
    } finally {
      ctx.waitUntil(queryClient.end());
    }
  }

  if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx);
  return env.SITE.fetch(request);
}