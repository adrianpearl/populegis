// server/app.ts
import type { HTMLRewriter as CFHTMLRewriter, Response as CFResponse } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { bills, provisions, users } from '@populegis/db';
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
          element(el: Element) {
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

  // after the existing billMatch handling

  if (botMatch) {
    let title = 'Popular Legislation';
    let description = 'A public intelligence operation where citizens vote on federal legislation and provisions.';

    if (url.pathname === '/governance' || url.pathname.startsWith('/governance/')) {
      title = 'Governance — Popular Legislation';
      description = 'A gift to Their Excellencies the Citizens of the United States of America on the occasion of their Semiquincentennial';
    } else if (url.pathname === '/privacy') {
      title = 'Privacy Policy — Popular Legislation';
      description = 'Privacy policy for Popular Legislation, including SMS messaging and mobile data practices.';
    } else {
      const profileMatch = url.pathname.match(/^\/profile\/([^/]+)\/?$/);
      if (profileMatch) {
        const username = profileMatch[1];
        const { queryClient, db } = createDb(env.HYPERDRIVE);
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.username, username),
            columns: { firstname: true, lastname: true, state: true, district: true },
          });
          const name = [user?.firstname, user?.lastname].filter(Boolean).join(' ') || username;
          const loc = user?.state && user?.district ? ` (${user.state}-${user.district})` : '';
          title = `${name} ${loc} — Popular Legislation`;
          description = `View ${name}’s votes on federal legislation and provisions. Public record of civic participation.`;
        } finally {
          ctx.waitUntil(queryClient.end());
        }
      }
    }

    if (title !== 'Popular Legislation' || description.includes('votes')) {
      const assetResponse = await env.SITE.fetch(request);
      return new HTMLRewriter()
        .on('head', {
          element(el) {
            el.append(`<meta property="og:title" content="${escapeAttr(title)}" />`, { html: true });
            el.append(`<meta property="og:description" content="${escapeAttr(description)}" />`, { html: true });
            el.append(`<meta property="og:type" content="profile" />`, { html: true });
            el.append(`<meta name="twitter:card" content="summary" />`, { html: true });
          },
        })
        .transform(assetResponse);
    }
  }

  if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx);
  return env.SITE.fetch(request);
}