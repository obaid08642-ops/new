/**
 * Phase 21.4 — the email provider chain: Resend → SES → Brevo, with a quota per
 * provider per window, a health state, a cooldown, and a return to the first
 * provider when its window resets.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { MailService, MailProvider } from './mail.module';

type Sent = { to: string; provider: string };

describe('Phase 21.4 email provider chain', () => {
  const envKeys = [
    'MAIL_PROVIDER_ORDER', 'RESEND_API_KEY', 'SES_SMTP_HOST', 'SES_SMTP_USER', 'SES_SMTP_PASS',
    'BREVO_SMTP_HOST', 'BREVO_API_KEY', 'MAIL_SEND_TIMEOUT_MS', 'MAIL_PROVIDER_COOLDOWN_MS',
    'RESEND_DAILY_QUOTA', 'SES_DAILY_QUOTA', 'BREVO_DAILY_QUOTA', 'MAIL_FROM',
    'MAILJET_API_KEY', 'MAILJET_SECRET_KEY', 'MAILJET_FROM', 'MAILJET_DAILY_QUOTA',
  ];
  const previous: Record<string, string | undefined> = {};
  let sent: Sent[];
  let failures: Map<MailProvider, () => Promise<unknown>>;

  function makeService() {
    // Every provider is "configured"; the transport is stubbed through the
    // private dispatch so the chain logic is what is under test, not HTTP.
    const svc = new MailService(new EventEmitter2());
    const dispatch = jest.spyOn(svc as unknown as { dispatch: (p: MailProvider) => Promise<void> }, 'dispatch');
    dispatch.mockImplementation(async (provider: MailProvider) => {
      const fail = failures.get(provider);
      if (fail) await fail();
      sent.push({ to: 'user@example.test', provider });
    });
    return { svc, dispatch };
  }

  beforeEach(() => {
    for (const k of envKeys) previous[k] = process.env[k];
    process.env.MAIL_PROVIDER_ORDER = 'resend,ses,brevo';
    process.env.RESEND_API_KEY = 'k';
    process.env.SES_SMTP_HOST = 'h';
    process.env.SES_SMTP_USER = 'u';
    process.env.SES_SMTP_PASS = 'p';
    process.env.BREVO_SMTP_HOST = 'h';
    process.env.BREVO_API_KEY = 'k';
    process.env.MAIL_PROVIDER_COOLDOWN_MS = '300000';
    delete process.env.RESEND_DAILY_QUOTA;
    delete process.env.SES_DAILY_QUOTA;
    delete process.env.BREVO_DAILY_QUOTA;
    sent = [];
    failures = new Map();
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    }
  });

  it('uses the first provider when it works', async () => {
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r).toMatchObject({ ok: true, provider: 'resend', fallback_used: false });
    expect(sent.map((s) => s.provider)).toEqual(['resend']);
  });

  it('moves to the next provider on an error, and reports the fallback', async () => {
    failures.set('resend', async () => { throw new Error('resend_down'); });
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r).toMatchObject({ ok: true, provider: 'ses', fallback_used: true });
    expect(sent.map((s) => s.provider)).toEqual(['ses']);
  });

  it('walks the whole chain to the last provider', async () => {
    failures.set('resend', async () => { throw new Error('resend_down'); });
    failures.set('ses', async () => { throw new Error('ses_down'); });
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r).toMatchObject({ ok: true, provider: 'brevo', fallback_used: true });
  });

  it('reports failure when no provider can deliver, without throwing', async () => {
    for (const p of ['resend', 'ses', 'brevo'] as MailProvider[]) {
      failures.set(p, async () => { throw new Error(`${p}_down`); });
    }
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r.ok).toBe(false);
    expect(r.provider).toBe('none');
  });

  it('skips a provider whose quota is used up and moves on', async () => {
    process.env.RESEND_DAILY_QUOTA = '1';
    const { svc } = makeService();
    await svc.send('a@example.test', 's', '<p>x</p>');
    const second = await svc.send('b@example.test', 's', '<p>x</p>');
    expect(second.provider).toBe('ses');
    expect(svc.providerState().find((s) => s.provider === 'resend')?.daily_used).toBe(1);
  });

  it('cools a provider down after repeated failures and returns to it when healthy again', async () => {
    failures.set('resend', async () => { throw new Error('resend_down'); });
    const { svc } = makeService();
    await svc.send('a@example.test', 's', '<p>x</p>');
    await svc.send('b@example.test', 's', '<p>x</p>');
    await svc.send('c@example.test', 's', '<p>x</p>');
    const state = svc.providerState().find((s) => s.provider === 'resend');
    expect(state?.consecutive_failures).toBeGreaterThanOrEqual(3);
    expect(state?.healthy).toBe(false);
    expect(state?.cooldown_until).toBeTruthy();
    // While cooling down the chain does not even try it.
    sent = [];
    failures.delete('resend');
    const r = await svc.send('d@example.test', 's', '<p>x</p>');
    expect(r.provider).toBe('ses');
    expect(sent.map((s) => s.provider)).not.toContain('resend');
  });

  it('reports configured/unconfigured honestly', async () => {
    delete process.env.BREVO_API_KEY;
    const svc = new MailService(new EventEmitter2());
    const state = svc.providerState();
    expect(state.find((s) => s.provider === 'resend')?.configured).toBe(true);
    expect(state.find((s) => s.provider === 'brevo')?.configured).toBe(false);
  });

  it('brands the OTP email as Nabd+ and states the real expiry', async () => {
    const svc = new MailService(new EventEmitter2());
    const spy = jest.spyOn(svc, 'send').mockResolvedValue({ ok: true, provider: 'resend', fallback_used: false });
    await svc.sendOtp('u@example.test', '123456', 7);
    const [to, subject, html, text] = spy.mock.calls[0] as [string, string, string, string];
    expect(to).toBe('u@example.test');
    expect(subject).toContain('نبض بلس');
    expect(subject).not.toContain('نَبْض');
    expect(html).toContain('123456');
    expect(html).toContain('7');
    expect(text).toContain('123456');
  });

  describe('shared quota counters (mail_quota collection)', () => {
    type Doc = { _id: string; count: number };
    function fakeStore() {
      const docs = new Map<string, Doc>();
      const col = {
        find: (q: { _id: { $in: string[] } }) => ({ toArray: async () => q._id.$in.map((k) => docs.get(k)).filter((d): d is Doc => Boolean(d)) }),
        findOneAndUpdate: async (q: { _id: string }, u: { $inc: { count: number } }) => {
          const d = docs.get(q._id) ?? { _id: q._id, count: 0 };
          d.count += u.$inc.count;
          docs.set(q._id, d);
          return { ...d };
        },
      };
      const conn = { db: { collection: () => col }, collection: () => ({ insertOne: async () => undefined }) } as unknown as Connection;
      return { conn, docs };
    }
    function serviceOn(conn: Connection) {
      const svc = new MailService(new EventEmitter2(), conn);
      jest.spyOn(svc as unknown as { dispatch: (p: MailProvider) => Promise<void> }, 'dispatch').mockImplementation(async (provider: MailProvider) => {
        sent.push({ to: 'user@example.test', provider });
      });
      return svc;
    }

    it('keeps the count after a restart (new service instance on the same store)', async () => {
      process.env.RESEND_DAILY_QUOTA = '1';
      const { conn } = fakeStore();
      await serviceOn(conn).send('a@example.test', 's', '<p>x</p>');
      const restarted = serviceOn(conn);
      const r = await restarted.send('b@example.test', 's', '<p>x</p>');
      expect(r.provider).toBe('ses');
      expect(restarted.providerState().find((s) => s.provider === 'resend')?.daily_used).toBe(1);
    });

    it('shares the count between two running instances', async () => {
      process.env.RESEND_DAILY_QUOTA = '2';
      const { conn, docs } = fakeStore();
      const a = serviceOn(conn);
      const b = serviceOn(conn);
      await a.send('a@example.test', 's', '<p>x</p>');
      await b.send('b@example.test', 's', '<p>x</p>');
      const third = await a.send('c@example.test', 's', '<p>x</p>');
      expect(third.provider).toBe('ses');
      const daily = [...docs.values()].find((d) => d._id.startsWith('resend:d:'));
      expect(daily?.count).toBe(2);
      const state = await b.sharedProviderState();
      expect(state.find((s) => s.provider === 'resend')?.monthly_used).toBe(2);
    });
  });

  describe('Mailjet (fourth provider)', () => {
    const realFetch = global.fetch;
    afterEach(() => { global.fetch = realFetch; });
    function mailjetOnly() {
      process.env.MAIL_PROVIDER_ORDER = 'mailjet';
      process.env.MAILJET_API_KEY = 'pub';
      process.env.MAILJET_SECRET_KEY = 'sec';
      process.env.MAILJET_FROM = 'Nabd <no-reply@example.test>';
    }

    it('is last in the default order and uses the free-tier quota', () => {
      delete process.env.MAIL_PROVIDER_ORDER;
      mailjetOnly();
      delete process.env.MAIL_PROVIDER_ORDER;
      delete process.env.MAILJET_DAILY_QUOTA;
      const state = new MailService(new EventEmitter2()).providerState();
      expect(state.map((s) => s.provider)).toEqual(['resend', 'ses', 'brevo', 'mailjet']);
      const mj = state.find((s) => s.provider === 'mailjet');
      expect(mj).toMatchObject({ configured: true, daily_quota: 200, monthly_quota: 6000 });
    });

    it('posts to the v3.1 Send API with basic auth', async () => {
      mailjetOnly();
      const fetchMock = jest.fn(async () => new Response(JSON.stringify({ Messages: [{ Status: 'success' }] }), { status: 200 }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const r = await new MailService(new EventEmitter2()).sendWithAttachment({ to: 'u@example.test', subject: 'S', html: '<p>h</p>', text: 't', filename: 'r.csv', content: 'a,b' });
      expect(r).toEqual({ ok: true, provider: 'mailjet', fallback_used: false });
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.mailjet.com/v3.1/send');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('pub:sec').toString('base64')}`);
      const body = JSON.parse(String(init.body));
      expect(body.Messages[0]).toMatchObject({
        From: { Email: 'no-reply@example.test', Name: 'Nabd' },
        To: [{ Email: 'u@example.test' }],
        Subject: 'S', HTMLPart: '<p>h</p>', TextPart: 't',
        Attachments: [{ Filename: 'r.csv', Base64Content: Buffer.from('a,b').toString('base64') }],
      });
    });

    it('reports a Mailjet error as a failed send without throwing', async () => {
      mailjetOnly();
      global.fetch = jest.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
      const r = await new MailService(new EventEmitter2()).send('u@example.test', 'S', '<p>h</p>');
      expect(r.ok).toBe(false);
      expect(r.error).toBe('mailjet_http_401');
    });

    it('is reached as the fallback after Brevo fails', async () => {
      process.env.MAILJET_API_KEY = 'pub';
      process.env.MAILJET_SECRET_KEY = 'sec';
      process.env.MAIL_PROVIDER_ORDER = 'resend,ses,brevo,mailjet';
      failures.set('resend', async () => { throw new Error('x'); });
      failures.set('ses', async () => { throw new Error('x'); });
      failures.set('brevo', async () => { throw new Error('x'); });
      const { svc } = makeService();
      const r = await svc.send('u@example.test', 'S', '<p>h</p>');
      expect(r).toMatchObject({ ok: true, provider: 'mailjet', fallback_used: true });
    });
  });
});
