// server/routes/sms.ts
import { Hono } from 'hono';
import type { Hyperdrive } from '@cloudflare/workers-types';
import { and, eq } from 'drizzle-orm';
import { smsSessions, users, votes } from '../../src/db/schema';
import { createDb } from '../db';

type Env = { DB_WRITE: Hyperdrive; TWILIO_AUTH_TOKEN: string };
export const sms = new Hono<{ Bindings: Env }>();

type Step = 'consent' | 'account';
type SessionData = { step: Step; firstname?: string; lastname?: string };

function reply(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'content-type': 'text/xml' } },
  );
}

const ACCOUNT_FORMAT = 'ACCOUNT, username, full name, state, district, attestation text, vote (AYE or NAY)';

async function twilioOk(request: Request, authToken: string) {
  const signature = request.headers.get('X-Twilio-Signature');
  if (!signature) return false;
  const form = await request.clone().formData();
  const params = [...form.entries()]
    .map(([k, v]) => [k, String(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join('');
  const url = new URL(request.url);
  const signed = url.origin + url.pathname + params;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

sms.post('/', async (c) => {
  if (!(await twilioOk(c.req.raw, c.env.TWILIO_AUTH_TOKEN))) {
    return c.text('forbidden', 403);
  }

  const form = await c.req.formData();
  const from = String(form.get('From') ?? '');
  const body = String(form.get('Body') ?? '').trim();
  const [command, ...rest] = body.split(/\s+/);
  const { queryClient, db } = createDb(c.env.DB_WRITE);

  // Enforce robust keyword checking for compliance safety
  const cleanBody = body.trim().toUpperCase();

  if (cleanBody.startsWith('STOP') || cleanBody.startsWith('QUIT')) {
    await db.delete(smsSessions).where(eq(smsSessions.phone, from));
    return reply('You will no longer receive messages. Your account and votes are unchanged.');
  }

  try {
    const session = await db.query.smsSessions.findFirst({
      where: and(eq(smsSessions.phone, from), eq(smsSessions.sessionType, 'signup')),
    });
    const user = await db.query.users.findFirst({ where: eq(users.phone, from) });
    const step = (session?.sessionData as SessionData | null)?.step;

    // STOP wins in every state. Opt-out only: a user row is left in place.
    if (/^stop$/i.test(command)) {
      await db.delete(smsSessions).where(eq(smsSessions.phone, from));
      return reply(user
        ? 'You will no longer receive messages. Your account and votes are unchanged.'
        : 'You will no longer receive messages.');
    }
    if (/^help$/i.test(command)) {
      return reply('SIGNUP to create an account. VOTE <bill> AYE or NAY. ADD BILL <id>. DELETE ACCOUNT. STOP to opt out.');
    }

    // consent: waiting for YES. Anything else repeats the disclosure.
    if (!user && step === 'consent') {
      if (!/^yes$/i.test(command)) return reply('Reply YES to consent, or STOP to cancel.');
      await db.update(smsSessions)
        .set({ sessionData: { step: 'account' } })
        .where(eq(smsSessions.phone, from));
      return reply(`Reply with ${ACCOUNT_FORMAT}. Example: ${['ada', 'Ada Lovelace', 'NY', '12', 'ATTEST', 'AYE'].join('\n')}`);
    }

    // account: one line creates the user and the governance vote, or stays here.
    // account: handles the newline separated block structure
    if (!user && step === 'account') {
      // Split on newlines instead of matching a strict inline regex pattern
      const lines = body.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      console.log(lines[0], lines.length, /^account$/i.test(lines[0]));

      // Validation: Ensure the body starts with ACCOUNT and contains all 7 required lines
      if (lines.length < 7 || !/^account$/i.test(lines[0])) {
        return reply(`Please send your account information in the following format: ${ACCOUNT_FORMAT} Visit populegis.org/governance/48 for a signup assistant tool.`);
      }

      const username = lines[1];
      const name = lines[2];
      const state = lines[3];
      const district = lines[4];
      // lines[5] is the long attestation text string
      const voteWord = lines[6];

      // Validate State (2 letters) & District (digits or "at large")
      if (!/^[A-Za-z]{2}/.test(state) || !/^(\d{1,2}|at large)/i.test(district)) {
        return reply(`Format error in State or District. Please use the layout: ${ACCOUNT_FORMAT}`);
      }

      // Parse names out of the full name line
      const [firstname, ...last] = name.split(/\s+/);
      if (!last.length) return reply('Include a first and last name.');

      // Validate vote input
      if (!/^(aye|nay)/i.test(voteWord)) {
        return reply('Please ensure your vote line at the end specifies either AYE or NAY.');
      }

      const taken = await db.query.users.findFirst({ where: eq(users.username, username) });
      if (taken) return reply('That username is taken. Send the same form with a different username.');

      await db.transaction(async (tx) => {
        const [insertedUser] = await tx.insert(users).values({
          username, phone: from, firstname, lastname: last.join(' '),
          state: state.toUpperCase(), district, city: '',
        }).returning({ id: users.id });

        await tx.insert(votes).values({
          userId: insertedUser.id, packageid: 'META-1', documentId: 'META-1',
          location: 0, voteOption: /^aye\$/i.test(voteWord) ? 'up' : 'down',
        });
        await tx.delete(smsSessions).where(eq(smsSessions.phone, from));
      });

      return reply(`Welcome ${firstname}. Your account (${username}) has been created. Visit populegis.org to start voting on bills.`);
    }

    // none: SIGNUP opens consent. Any other command needs an account.
    if (/^signup$/i.test(command)) {
      if (user) return reply('This number already has an account. Text HELP for commands.');
      await db.insert(smsSessions).values({
        phone: from, sessionType: 'signup', sessionData: { step: 'consent' },
      });
      return reply('Welcome to Popular Legislation. Reply YES to create an account and receive automated updates. By replying YES you consent to populegis.org/governance. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.');
    }

    if (!user) {
      return reply('No account for this number. Text SIGNUP to begin.');
    }

    if (/^delete$/i.test(command) && /^account$/i.test(rest[0] ?? '')) {
      await db.transaction(async (tx) => {
        await tx.delete(votes).where(eq(votes.userId, user.id));
        await tx.delete(users).where(eq(users.id, user.id));
        await tx.delete(smsSessions).where(eq(smsSessions.phone, from));
      });
      return reply('Your account and votes have been deleted. Text SIGNUP to create a new one.');
    }

    const vote = body.match(/^vote\s+(\S+)\s+(aye|nay)$/i);
    if (vote) {
      const packageid = vote[1].startsWith('BILLS-') || vote[1].startsWith('META-') ? vote[1] : `BILLS-${vote[1]}`;
      const voteOption = /^aye$/i.test(vote[2]) ? 'up' : 'down';
      await db.insert(votes).values({
        userId: user.id, packageid, documentId: packageid, location: 0, voteOption,
      }).onConflictDoUpdate({
        target: [votes.userId, votes.location, votes.packageid],
        set: { voteOption, documentId: packageid, updatedAt: new Date().toISOString() },
      });
      return reply(`Recorded ${vote[2].toUpperCase()} on ${packageid}.`);
    }

    if (/^add\s+bill\s+(\S+)$/i.test(body)) {
      const raw = body.split(/\s+/)[2];
      const packageid = raw.startsWith('BILLS-') ? raw : `BILLS-${raw}`;
      // const result = await ingestBill(c.env, packageid);
      // return reply(result.existed
      //   ? `${packageid} is already loaded.`
      //   : `Added ${packageid} with ${result.provisions} provisions.`);
    }

    return reply('Text HELP for commands.');
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});