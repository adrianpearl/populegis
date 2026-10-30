// server/routes/sms.ts
import { Hono } from 'hono';
import type { Hyperdrive } from '@cloudflare/workers-types';
import { and, eq } from 'drizzle-orm';
import { smsSessions, users, votes, bills, provisions } from '@populegis/db';
import { createDb } from '../db';

type Env = { SMS: Hyperdrive; TWILIO_AUTH_TOKEN: string };
export const sms = new Hono<{ Bindings: Env }>();

type Step = 'consent' | 'account';
type SessionData = { step: Step; firstname?: string; lastname?: string };

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reply(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
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
  const { queryClient, db } = createDb(c.env.SMS);

  try {
    const session = await db.query.smsSessions.findFirst({
      where: and(eq(smsSessions.phone, from), eq(smsSessions.sessionType, 'signup')),
    });
    const user = await db.query.users.findFirst({ where: eq(users.phone, from) });
    const step = (session?.sessionData as SessionData | null)?.step;

    // HELP, STOP, and START are answered by Twilio (Messaging Service opt-out responses).
    // Do not handle them here. SIGNUP always resets any leftover session so a mid-signup
    // STOP/START does not leave the number stuck in the consent step.
    // Twilio Advanced Opt-Out answers HELP/STOP/START itself.
    // Return empty TwiML so we don't send a second reply.
    if (/^(help|stop|start|unstop|quit)$/i.test(command)) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'content-type': 'text/xml' } },
      );
    }

    if (/^signup$/i.test(command)) {
      if (user) return reply('This number already has an account. Text HELP for commands.');
      await db.delete(smsSessions).where(eq(smsSessions.phone, from));
      await db.insert(smsSessions).values({
        phone: from, sessionType: 'signup', sessionData: { step: 'consent' },
      });
      return reply('Welcome to Popular Legislation. Reply YES to create an account and receive automated updates. By replying YES you consent to populegis.org/terms. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.');
    }

    // consent: waiting for YES
    if (!user && step === 'consent') {
      if (!/^yes$/i.test(command)) return reply('Reply YES to consent, or STOP to cancel.');
      await db.update(smsSessions)
        .set({ sessionData: { step: 'account' } })
        .where(eq(smsSessions.phone, from));
      return reply('Popular Legislation: You are opted in. Reply with ACCOUNT, username, full name, state, district, attestation text, vote (AYE or NAY). See populegis.org/governance/47 for assistance. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel.');
    }

    // account: newline-separated block
    if (!user && step === 'account') {
      const lines = body.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

      if (lines.length < 7 || !/^account$/i.test(lines[0])) {
        return reply(`Please send your account information in the following format: ${ACCOUNT_FORMAT} Visit populegis.org/governance/48 for a signup assistant tool.`);
      }

      const username = lines[1];
      const name = lines[2];
      const state = lines[3];
      const district = lines[4];
      const voteWord = lines[6];

      if (!/^[A-Za-z]{2}/.test(state) || !/^(\d{1,2}|at large)/i.test(district)) {
        return reply(`Format error in State or District. Please use the layout: ${ACCOUNT_FORMAT}`);
      }

      const [firstname, ...last] = name.split(/\s+/);
      if (!last.length) return reply('Include a first and last name.');

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
          location: 0, voteOption: /^aye$/i.test(voteWord) ? 'up' : 'down',
        });
        await tx.delete(smsSessions).where(eq(smsSessions.phone, from));
      });

      return reply(`Welcome ${firstname}. Your account (${username}) has been created. Visit populegis.org to start voting on bills.`);
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

    const voteMatch = body.match(/^(?:delete\s+)?vote\s+(\S+)(?:\s+(\d+))?\s+(aye|nay)$/i)
      ?? body.match(/^delete\s+vote\s+(\S+)(?:\s+(\d+))?$/i);

    if (voteMatch) {
      const isDelete = /^delete/i.test(body);
      const rawId = voteMatch[1];
      const location = voteMatch[2] ? Number(voteMatch[2]) : 0;
      const packageid = rawId.startsWith('BILLS-') || rawId.startsWith('META-') ? rawId : `BILLS-${rawId}`;

      // existence
      if (location === 0) {
        const bill = await db.query.bills.findFirst({ where: eq(bills.packageid, packageid) });
        if (!bill) return reply(`No bill found for ${packageid}.`);
      } else {
        const provision = await db.query.provisions.findFirst({
          where: and(eq(provisions.packageid, packageid), eq(provisions.location, location)),
        });
        if (!provision) return reply(`No provision at location ${location} on ${packageid}.`);
      }

      if (isDelete) {
        const existing = await db.query.votes.findFirst({
          where: and(eq(votes.userId, user.id), eq(votes.packageid, packageid), eq(votes.location, location)),
        });
        if (!existing) {
          return reply(location
            ? `You have no vote on ${packageid} provision ${location}.`
            : `You have no vote on ${packageid}.`);
        }
        await db.delete(votes).where(eq(votes.id, existing.id));
        return reply(location
          ? `Deleted vote on ${packageid} provision ${location}.`
          : `Deleted vote on ${packageid}.`);
      }

      const voteOption = /^aye$/i.test(voteMatch[3]) ? 'up' : 'down';
      const prior = await db.query.votes.findFirst({
        where: and(eq(votes.userId, user.id), eq(votes.packageid, packageid), eq(votes.location, location)),
      });

      await db.insert(votes).values({
        userId: user.id, packageid, documentId: packageid, location, voteOption,
      }).onConflictDoUpdate({
        target: [votes.userId, votes.location, votes.packageid],
        set: { voteOption, documentId: packageid, updatedAt: new Date().toISOString() },
      });

      const verb = prior ? 'Updated' : 'Recorded';
      return reply(location
        ? `${verb} ${voteMatch[3].toUpperCase()} on ${packageid} provision ${location}.`
        : `${verb} ${voteMatch[3].toUpperCase()} on ${packageid}.`);
    }

    if (/^add\s+bill\s+(\S+)$/i.test(body)) {
      const raw = body.split(/\s+/)[2];
      const packageid = raw.startsWith('BILLS-') ? raw : `BILLS-${raw}`;
      return reply(`ADD BILL under construction, please check back soon.`);
    }

    return reply('Text HELP for commands.');
  } finally {
    c.executionCtx.waitUntil(queryClient.end());
  }
});