// server/routes/public.ts
import { Hono } from 'hono';
import type { Hyperdrive } from '@cloudflare/workers-types';
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { bills, governanceDocuments, provisions, users, votes } from '@populegis/db';
import { BillSearch } from '@populegis/shared';
import { createDb } from '../db';

type Env = { HYPERDRIVE: Hyperdrive };
export const publicApi = new Hono<{ Bindings: Env }>();

const ORDER_FIELDS = {
  dateIssued: bills.dateIssued,
  lastModified: bills.lastModified,
  lastAction: bills.lastAction,
  lastUpdate: bills.lastUpdate,
} as const;

function readFilters(raw: string | undefined): Partial<BillSearch> {
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

publicApi.get('/bills', async (c) => {
  const { queryClient, db } = createDb(c.env.HYPERDRIVE);
  try {
    const filters = readFilters(c.req.query('filters'));
    const orderKey = c.req.query('orderField');
    const orderColumn = ORDER_FIELDS[orderKey as keyof typeof ORDER_FIELDS] ?? bills.dateIssued;
    const direction = c.req.query('orderDir') === 'asc' ? asc : desc;
    const limit = Math.min(Number(c.req.query('limit')) || 10, 50);
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0);

    const where: SQL[] = [];
    where.push(sql`${bills.form} is not null and ${bills.form} <> ''`);
    if (filters.congress?.length) where.push(inArray(bills.congress, filters.congress));
    if (filters.originChamber) where.push(sql`lower(${bills.originChamber}) = lower(${filters.originChamber})`);
    if (filters.billTypes?.length) where.push(inArray(sql`lower(${bills.billType})`, filters.billTypes.map((t) => t.toLowerCase())));
    if (filters.number != null && filters.number !== ('' as unknown)) where.push(eq(bills.number, Number(filters.number)));
    if (filters.title) {
      const pattern = like(filters.title);
      where.push(filters.includeOfficialTitle === false
        ? ilike(bills.shortTitle, pattern)
        : or(ilike(bills.shortTitle, pattern), ilike(bills.officialTitle, pattern))!);
    }
    if (filters.versions?.length) where.push(inArray(bills.version, filters.versions));
    if (filters.sponsorName) where.push(sql`${bills.sponsor}::text ilike ${like(filters.sponsorName)}`);
    if (filters.appropriationsOnly) {
      where.push(sql`exists (
        select 1 from provisions p
        where p.packageid = ${bills.packageid}
          and p.provision_type ~* 'appropriations'
      )`);
    }
    if (filters.policyArea) {
      where.push(sql`${bills.status} @> cast(${JSON.stringify({ policyArea: { name: filters.policyArea } })} as jsonb)`);
    }
    if (filters.legislativeSubject) {
      where.push(sql`${bills.status} @> cast(${JSON.stringify({ subjects: { legislativeSubjects: [{ name: filters.legislativeSubject }] } })} as jsonb)`);
    }

    const rows = await db.query.bills.findMany({
      where: where.length ? and(...where) : undefined,
      orderBy: [direction(orderColumn)],
      limit: limit + 1,
      offset,
      with: { tags: true, comments: true },
    });
    const hasMore = rows.length > limit;
    c.header('X-Has-More', String(hasMore));
    return c.json(rows.slice(0, limit));
  } catch (err: any) {
    return c.json({ error: 'Database query failed', details: err.message }, 500);
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});

publicApi.get('/provisions', async (c) => {
  const packageid = c.req.query('packageid');
  if (!packageid) return c.json({ error: 'packageid is required' }, 400);

  const { queryClient, db } = createDb(c.env.HYPERDRIVE);
  try {
    const levelLte = c.req.query('levelLte');
    const tag = c.req.query('tag');
    const tocOnly = c.req.query('toc') === '1';
    const limit = Math.min(Number(c.req.query('limit')) || 1000, 10000);
    const where = [eq(provisions.packageid, packageid)];
    if (levelLte) where.push(lte(provisions.level, Number(levelLte)));
    if (tag) where.push(or(eq(provisions.provisionTag, tag), ilike(provisions.provisionTag, `${tag}-%`))!);
    if (tocOnly) {
      where.push(or(
        and(sql`${provisions.header} is not null`, ne(provisions.header, '')),
        inArray(provisions.provisionType, ['title', 'section', 'quoted-block']),
      )!);
    }
    const q = c.req.query('q')?.trim();
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
    return c.json(rows);
  } catch (err: any) {
    return c.json({ error: 'Database query failed', details: err.message }, 500);
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});

publicApi.get('/bill', async (c) => {
  const packageid = c.req.query('packageid');
  if (!packageid) return c.json({ error: 'packageid is required' }, 400);

  const { queryClient, db } = createDb(c.env.HYPERDRIVE);
  try {
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0);
    const limit = Math.min(Number(c.req.query('limit')) || 250, 1000);
    const bill = await db.query.bills.findFirst({ where: eq(bills.packageid, packageid) });
    if (!bill) return c.json({ error: 'Not found' }, 404);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(provisions)
      .where(eq(provisions.packageid, packageid));
    const rows = await db.query.provisions.findMany({
      where: and(
        eq(provisions.packageid, packageid),
        gte(provisions.location, offset),
        sql`${provisions.provisionTag} not ilike '%toc%'`,
      ),
      orderBy: [asc(provisions.location)],
      limit,
    });
    return c.json({ bill: { ...bill, provisionCount: count }, provisions: rows });
  } catch (err: any) {
    return c.json({ error: 'Database query failed', details: err.message }, 500);
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});

publicApi.get('/users/:username/votes', async (c) => {
  const username = c.req.param('username');
  const { queryClient, db } = createDb(c.env.HYPERDRIVE);
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { id: true, firstname: true, lastname: true, state: true, district: true },
    });
    if (!user) return c.json({ error: 'Not found' }, 404);

    const filters = readFilters(c.req.query('filters'));
    const orderKey = c.req.query('orderField');
    const orderColumn = ORDER_FIELDS[orderKey as keyof typeof ORDER_FIELDS] ?? bills.dateIssued;
    const direction = c.req.query('orderDir') === 'asc' ? asc : desc;
    const limit = Math.min(Number(c.req.query('limit')) || 10, 50);
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0);

    const where: SQL[] = [eq(votes.userId, user.id)];
    // same filter pushes as /api/bills, against bills.*
    const rows = await db
      .select({ bill: bills, location: votes.location, voteOption: votes.voteOption, provision: provisions })
      .from(votes)
      .innerJoin(bills, eq(votes.packageid, bills.packageid))
      .leftJoin(provisions, and(eq(provisions.packageid, votes.packageid), eq(provisions.location, votes.location)))
      .where(and(...where))
      .orderBy(direction(orderColumn), asc(votes.location))
      .limit(limit + 1)
      .offset(offset);

    const grouped = new Map<string, any>();
    for (const row of rows) {
      const item = grouped.get(row.bill.packageid) ?? { ...row.bill, vote: null, subprovisionVotes: [] };
      if (row.location === 0) item.vote = row.voteOption;
      else item.subprovisionVotes.push({ location: row.location, voteOption: row.voteOption, provision: row.provision });
      grouped.set(row.bill.packageid, item);
    }
    const list = [...grouped.values()];
    c.header('X-Has-More', String(list.length > limit));
    return c.json({ user, bills: list.slice(0, limit) });
  } catch (err: any) {
    return c.json({ error: 'Database query failed', details: err.cause?.message ?? err.message }, 500);
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});

publicApi.get('/governance', async (c) => {
  const documentId = c.req.query('documentId');
  if (!documentId) return c.json({ error: 'documentId is required' }, 400);
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0);
  const limit = Math.min(Number(c.req.query('limit')) || 250, 1000);
  const { queryClient, db } = createDb(c.env.HYPERDRIVE);
  try {
    const document = await db.query.governanceDocuments.findFirst({ where: eq(governanceDocuments.documentId, documentId) });
    if (!document) return c.json({ error: 'Not found' }, 404);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(provisions).where(eq(provisions.documentId, documentId));
    const rows = await db.query.provisions.findMany({
      where: and(eq(provisions.documentId, documentId), gte(provisions.location, offset)),
      orderBy: [asc(provisions.location)],
      limit,
    });
    return c.json({ document, provisions: rows, provisionCount: count });
  } catch (err: any) {
    return c.json({ error: 'Database query failed', details: err.message }, 500);
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});