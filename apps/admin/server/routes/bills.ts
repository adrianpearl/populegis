// server/routes/admin.ts
import { Hono } from 'hono';
import type { Hyperdrive } from '@cloudflare/workers-types';
import { eq } from 'drizzle-orm';
import { bills, provisions } from '@populegis/db';
import { createDb } from '../db';

export const billsadd = new Hono<{ Bindings: { DB_WRITE: Hyperdrive } }>();

billsadd.put('/bills/:packageid', async (c) => {
  const packageid = c.req.param('packageid');
  const body = await c.req.json<{ bill: typeof bills.$inferInsert; provisions: (typeof provisions.$inferInsert)[] }>();
  if (body.bill?.packageid !== packageid) return c.json({ error: 'packageid mismatch' }, 400);

  const kind = packageid.startsWith('META-') ? 'meta' : 'bill';
  const provisionRows = body.provisions.map((row) => ({
    ...row,
    documentId: packageid,
    documentKind: kind,
  }));

  const { queryClient, db } = createDb(c.env.DB_WRITE);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(provisions).where(eq(provisions.packageid, packageid));
      await tx.delete(bills).where(eq(bills.packageid, packageid));
      await tx.insert(bills).values(body.bill);
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