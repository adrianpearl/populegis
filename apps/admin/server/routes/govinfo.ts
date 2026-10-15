// server/routes/govinfo.ts
import { Hono } from 'hono';

type Env = { GOVINFO_API_KEY: string };
const GOVINFO = 'https://api.govinfo.gov';

async function govinfoFetch(apiKey: string, path: string) {
  const url = new URL(path, GOVINFO);
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GovInfo ${response.status} for ${url.pathname}`);
  return response;
}

export const govinfo = new Hono<{ Bindings: Env }>();

govinfo.get('/modified', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');
  if (!from || !to) return c.json({ error: 'from and to are required' }, 400);

  const offsetMark = c.req.query('offsetMark') || '*';
  const pageSize = c.req.query('pageSize') || '20';
  try {
    const response = await govinfoFetch(
      c.env.GOVINFO_API_KEY,
      `/collections/BILLS/${from}T00:00:00Z/${to}T23:59:59Z?offsetMark=${encodeURIComponent(offsetMark)}&pageSize=${pageSize}`,
    );
    const body = await response.json() as { packages?: unknown[]; nextPage?: string | null };
    const nextOffsetMark = body.nextPage ? new URL(body.nextPage).searchParams.get('offsetMark') : null;
    return c.json({ packages: body.packages ?? [], nextOffsetMark });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

govinfo.get('/package', async (c) => {
  const packageid = c.req.query('packageid');
  if (!packageid?.startsWith('BILLS-')) return c.json({ error: 'BILLS packageid required' }, 400);

  const statusId = packageid.replace(/[^\d]+$/, '').replace('BILLS', 'BILLSTATUS');
  try {
    const summaryResponse = await govinfoFetch(c.env.GOVINFO_API_KEY, `/packages/${packageid}/summary`);
    const summary = await summaryResponse.json() as { download?: { xmlLink?: string } };
    const xmlLink = summary.download?.xmlLink;
    if (!xmlLink) return c.json({ error: 'Package has no xmlLink' }, 502);

    const [xmlResponse, statusResponse] = await Promise.all([
      govinfoFetch(c.env.GOVINFO_API_KEY, new URL(xmlLink).pathname),
      govinfoFetch(c.env.GOVINFO_API_KEY, `/packages/${statusId}/xml`),
    ]);
    return c.json({
      summary,
      xml: await xmlResponse.text(),
      statusXml: await statusResponse.text(),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});