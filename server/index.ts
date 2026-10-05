// server/index.ts
import type { ExportedHandler, Fetcher, HTMLRewriter as CFHTMLRewriter, Response as CFResponse, Hyperdrive } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { bills, provisions } from '../src/db/schema';
import * as schema from '../src/db/schema';
import * as relations from '../src/db/relations';
import { and, asc, desc, eq, ilike, inArray, or, lte, ne, sql, type SQL } from 'drizzle-orm';
import type { BillSearch } from '../shared/bills';

const ORDER_FIELDS = {
  dateIssued: bills.dateIssued,
  lastModified: bills.lastModified,
  lastAction: bills.lastAction,
  lastUpdate: bills.lastUpdate,
} as const;

function readFilters(raw: string | null): Partial<BillSearch> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function like(value: string) {
  return `%${value.replace(/[%_\\]/g, '\\$&')}%`;
}

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
        const filters = readFilters(url.searchParams.get('filters'));
        const orderKey = url.searchParams.get('orderField');
        const orderColumn = ORDER_FIELDS[orderKey as keyof typeof ORDER_FIELDS] ?? bills.dateIssued;
        const direction = url.searchParams.get('orderDir') === 'asc' ? asc : desc;
        const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 50);
        const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

        const where: SQL[] = [];
        if (filters.congress?.length) where.push(inArray(bills.congress, filters.congress));
        if (filters.originChamber) {
          where.push(sql`lower(${bills.originChamber}) = lower(${filters.originChamber})`);
        }
        if (filters.billTypes?.length) {
          where.push(inArray(bills.billType, filters.billTypes.map((t) => t.toLowerCase())));
        }
        if (filters.number != null && filters.number !== ('' as unknown)) {
          where.push(eq(bills.number, Number(filters.number)));
        }
        if (filters.title) {
          const pattern = like(filters.title);
          where.push(
            filters.includeOfficialTitle === false
              ? ilike(bills.shortTitle, pattern)
              : or(ilike(bills.shortTitle, pattern), ilike(bills.officialTitle, pattern))!,
          );
        }
        if (filters.versions?.length) where.push(inArray(bills.version, filters.versions));
        if (filters.sponsorName) {
          where.push(sql`${bills.sponsor}::text ilike ${like(filters.sponsorName)}`);
        }

        const rows = await db.query.bills.findMany({
          where: where.length ? and(...where) : undefined,
          orderBy: [direction(orderColumn)],
          limit: limit + 1,
          offset,
          with: { tags: true, comments: true },
        });

        const hasMore = rows.length > limit;
        return new (globalThis as any).Response(JSON.stringify(rows.slice(0, limit)), {
          headers: {
            'Content-Type': 'application/json',
            'X-Has-More': String(hasMore),
          },
        });
      } catch (err: any) {
        return new (globalThis as any).Response(JSON.stringify({
          error: 'Database query failed',
          details: err.message,
        }), { status: 500 });
      } finally {
        ctx.waitUntil(queryClient.end());
      }
    }

    if (url.pathname === '/api/provisions') {
      const packageid = url.searchParams.get('packageid');
      if (!packageid) {
        return new (globalThis as any).Response(
          JSON.stringify({ error: 'packageid is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ) as unknown as CFResponse;
      }

      const { queryClient, db } = createDb(env);
      try {
        const levelLte = url.searchParams.get('levelLte');
        const tag = url.searchParams.get('tag');
        const tocOnly = url.searchParams.get('toc') === '1';
        const limit = Math.min(Number(url.searchParams.get('limit')) || 1000, 2000);

        const where = [eq(provisions.packageid, packageid)];
        if (levelLte) where.push(lte(provisions.level, Number(levelLte)));
        if (tag) {
          where.push(or(
            eq(provisions.provisionTag, tag),
            ilike(provisions.provisionTag, `${tag}-%`),
          )!);
        }
        // Hasura header: { _neq: "" } does not match null, so keep that.
        if (tocOnly) {
          where.push(or(
            and(sql`${provisions.header} is not null`, ne(provisions.header, '')),
            inArray(provisions.provisionType, ['title', 'section', 'quoted-block']),
          )!);
        }
        const q = url.searchParams.get('q')?.trim();
        if (q) {
          const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
          where.push(sql`(
            regexp_replace(coalesce(${provisions.text}, ''), '<[^>]+>', '', 'g') ilike ${pattern}
            or regexp_replace(coalesce(${provisions.header}, ''), '<[^>]+>', '', 'g') ilike ${pattern}
          )`);
        }

        const rows = await db.query.provisions.findMany({
          where: and(...where),
          orderBy: [asc(provisions.location)],
          limit,
        });

        return new (globalThis as any).Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        }) as unknown as CFResponse;
      } catch (err: any) {
        return new (globalThis as any).Response(JSON.stringify({
          error: 'Database query failed',
          details: err.message,
        }), { status: 500 }) as unknown as CFResponse;
      } finally {
        ctx.waitUntil(queryClient.end());
      }
    }

    return env.ASSETS.fetch(request) as unknown as CFResponse;
  },
} satisfies ExportedHandler<Env>;