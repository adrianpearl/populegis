// server/routes/admin.ts
import { Hono } from 'hono';
import type { Hyperdrive } from '@cloudflare/workers-types';
import { and, eq, ne } from 'drizzle-orm';
import { bills, provisions } from '@populegis/db';
import { createDb } from '../db';

export const billsadd = new Hono<{ Bindings: { LEGIS_ADMIN: Hyperdrive } }>();

// version rank only used for title slug eviction
// eg suppose populegis.org/bill/one-big-beautiful-bill-act goes to version "eh"
// then version "enr" is ingested, slug will be assigned to "enr" b/c higher priority
const VERSION_RANK: Record<string, number> = {
  enr: 100,
  eh: 80, es: 80, rdh: 80, rds: 80,
  rh: 60, rs: 60,
  rth: 40, rts: 40, pcs: 40, pch: 40,
  ih: 20, is: 20,
};

function versionRank(v?: string | null): number {
  return VERSION_RANK[(v ?? '').toLowerCase()] ?? 0;
}

async function resolveSlug(
  db: any,
  desired: string,
  incoming: { packageid: string; congress: number; version: string }
): Promise<string> {
  if (!desired) return desired;

  const existing = await db.query.bills.findFirst({
    where: and(eq(bills.slug, desired), ne(bills.packageid, incoming.packageid)),
    columns: { packageid: true, congress: true, version: true },
  });

  if (!existing) return desired;

  const incomingBetter =
    incoming.congress > (existing.congress ?? 0) ||
    (incoming.congress === existing.congress &&
      versionRank(incoming.version) > versionRank(existing.version));

  if (incomingBetter) {
    // Steal the clean slug; push the previous owner to a disambiguated one
    const fallback = await uniqueSlug(db, `${desired}-${existing.version || 'old'}`, incoming.packageid);
    await db.update(bills)
      .set({ slug: fallback })
      .where(eq(bills.packageid, existing.packageid));
    return desired;
  }

  // Keep the existing clean slug; disambiguate the new bill
  return uniqueSlug(db, `${desired}-${incoming.version || incoming.packageid.slice(-6)}`, incoming.packageid);
}

async function uniqueSlug(db: any, base: string, excludePackageid: string): Promise<string> {
  let candidate = base;
  let n = 2;
  while (true) {
    const hit = await db.query.bills.findFirst({
      where: and(eq(bills.slug, candidate), ne(bills.packageid, excludePackageid)),
      columns: { packageid: true },
    });
    if (!hit) return candidate;
    candidate = `${base}-${n++}`;
  }
}

billsadd.put('/bills/:packageid', async (c) => {
  const packageid = c.req.param('packageid');
  const body = await c.req.json<{ bill: typeof bills.$inferInsert; provisions: (typeof provisions.$inferInsert)[] }>();
  if (body.bill?.packageid !== packageid) return c.json({ error: 'packageid mismatch' }, 400);

  const bill = body.bill;
  const kind = packageid.startsWith('META-') ? 'meta' : 'bill';
  const provisionRows = body.provisions.map((row) => ({
    ...row,
    documentId: packageid,
    documentKind: kind,
  }));

  const { queryClient, db } = createDb(c.env.LEGIS_ADMIN);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(provisions).where(eq(provisions.packageid, packageid));
      await tx.delete(bills).where(eq(bills.packageid, packageid));
      bill.slug = await resolveSlug(db, bill.slug ?? "", {
        packageid: bill.packageid,
        congress: bill.congress,
        version: bill.version ?? "",
      });
      await tx.insert(bills).values(bill);
      for (let i = 0; i < provisionRows.length; i += 500) {
        await tx.insert(provisions).values(provisionRows.slice(i, i + 500));
      }
    });
    return c.json({ packageid, provisions: provisionRows.length });
  } catch (err: any) {
    return c.json({ error: 'Upload failed', details: err.message }, 500);
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});