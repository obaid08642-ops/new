/**
 * Email provider chain (owner spec 2026-10-16): Resend, Brevo (REST), Mailjet (REST v3.1); SES only when ordered.
 * The primary rotates every Riyadh calendar month; fall-over on quota or failure (with cooldown) and back to the
 * primary when its window resets; counters shared in Mongo 'mail_quota'; weekly keep-alive through each
 * non-primary provider, once per provider per week across processes.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MailService, MailProvider, riyadhWindows } from './mail.module';

type Sent = { to: string; subject: string; provider: MailProvider };

/** 2026-01-15 12:00 Riyadh: (2026 * 12 + 0) mod N = 0 for N = 2, 3 and 4, so the first configured provider is primary. */
const JAN_15 = Date.parse('2026-01-15T09:00:00Z');

describe('email provider chain', () => {
  const envKeys = [
    'MAIL_PROVIDER_ORDER', 'RESEND_API_KEY', 'SES_SMTP_HOST', 'SES_SMTP_USER', 'SES_SMTP_PASS',
    'BREVO_API_KEY', 'BREVO_API_BASE', 'BREVO_FROM', 'MAIL_SEND_TIMEOUT_MS', 'MAIL_PROVIDER_COOLDOWN_MS',
    'RESEND_DAILY_QUOTA', 'RESEND_MONTHLY_QUOTA', 'SES_DAILY_QUOTA', 'BREVO_DAILY_QUOTA', 'MAIL_FROM',
    'MAILJET_API_KEY', 'MAILJET_SECRET_KEY', 'MAILJET_FROM', 'MAILJET_DAILY_QUOTA', 'MAILJET_API_BASE', 'OPS_ALERT_EMAIL',
  ];
  const previous: Record<string, string | undefined> = {};
  let sent: Sent[];
  let failures: Map<MailProvider, () => Promise<unknown>>;

  function stub(svc: MailService, at: number = JAN_15) {
    svc.now = () => at;
    // The transport is stubbed through the private dispatch so the chain logic is under test, not HTTP.
    jest.spyOn(svc as unknown as { dispatch: (p: MailProvider, to: string, subject: string) => Promise<void> }, 'dispatch')
      .mockImplementation(async (provider: MailProvider, to: string, subject: string) => {
        const fail = failures.get(provider);
        if (fail) await fail();
        sent.push({ to, subject, provider });
      });
    return svc;
  }
  const makeService = (conn?: Connection, at?: number) => stub(new MailService(new EventEmitter2(), conn), at);

  beforeEach(() => {
    for (const k of envKeys) { previous[k] = process.env[k]; delete process.env[k]; }
    process.env.RESEND_API_KEY = 'k';
    process.env.BREVO_API_KEY = 'k';
    process.env.MAILJET_API_KEY = 'pub';
    process.env.MAILJET_SECRET_KEY = 'sec';
    process.env.MAIL_PROVIDER_COOLDOWN_MS = '300000';
    sent = [];
    failures = new Map();
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    }
  });

  describe('providers', () => {
    it('defaults to Resend, Brevo, Mailjet without SES, even when SES is configured', () => {
      process.env.SES_SMTP_HOST = 'h'; process.env.SES_SMTP_USER = 'u'; process.env.SES_SMTP_PASS = 'p';
      const svc = makeService();
      expect(svc.providerState().map((s) => s.provider)).toEqual(['resend', 'brevo', 'mailjet']);
      expect(svc.chain()).not.toContain('ses');
    });

    it('uses SES only when MAIL_PROVIDER_ORDER names it', () => {
      process.env.SES_SMTP_HOST = 'h'; process.env.SES_SMTP_USER = 'u'; process.env.SES_SMTP_PASS = 'p';
      process.env.MAIL_PROVIDER_ORDER = 'resend,ses';
      expect(makeService().chain()).toEqual(['resend', 'ses']);
    });

    it('skips a provider with no key', async () => {
      delete process.env.RESEND_API_KEY;
      const svc = makeService();
      expect(svc.chain()).toEqual(['brevo', 'mailjet']);
      expect(svc.providerState().find((s) => s.provider === 'resend')?.configured).toBe(false);
      const r = await svc.send('u@example.test', 's', '<p>x</p>');
      expect(r).toMatchObject({ ok: true, provider: 'brevo', fallback_used: false });
    });

    it('reports failure when no provider can deliver, without throwing', async () => {
      for (const p of ['resend', 'brevo', 'mailjet'] as MailProvider[]) failures.set(p, async () => { throw new Error(`${p}_down`); });
      const r = await makeService().send('u@example.test', 's', '<p>x</p>');
      expect(r).toMatchObject({ ok: false, provider: 'none', fallback_used: true, error: 'mailjet_down' });
    });
  });

  describe('monthly rotation in Riyadh time', () => {
    it('computes Riyadh day and month windows (UTC+3)', () => {
      const w = riyadhWindows(Date.parse('2026-01-31T21:00:00Z'));
      expect(new Date(w.dayStart).toISOString()).toBe('2026-01-31T21:00:00.000Z');
      expect(new Date(w.monthStart).toISOString()).toBe('2026-01-31T21:00:00.000Z');
      expect(w.monthIndex).toBe(2026 * 12 + 1);
    });

    it('rotates the primary at the Riyadh month boundary, not the UTC one', () => {
      const svc = makeService();
      const at = (iso: string) => svc.primaryProvider(Date.parse(iso));
      expect(at('2026-01-31T20:59:59Z')).toBe('resend'); // 23:59:59 on 31 January in Riyadh
      expect(at('2026-01-31T21:00:00Z')).toBe('brevo'); // 00:00 on 1 February in Riyadh (still January in UTC)
      expect(at('2026-03-15T09:00:00Z')).toBe('mailjet');
      expect(at('2026-04-01T09:00:00Z')).toBe('resend');
      expect(svc.chain(Date.parse('2026-02-10T09:00:00Z'))).toEqual(['brevo', 'mailjet', 'resend']);
    });

    it('sends through the month primary first every day of the month', async () => {
      const feb = Date.parse('2026-02-10T09:00:00Z');
      const svc = makeService(undefined, feb);
      expect(await svc.send('a@example.test', 's', '<p>x</p>')).toMatchObject({ provider: 'brevo', fallback_used: false });
      svc.now = () => feb + 5 * 86_400_000;
      expect(await svc.send('b@example.test', 's', '<p>x</p>')).toMatchObject({ provider: 'brevo', fallback_used: false });
      expect(svc.providerState().find((s) => s.primary)?.provider).toBe('brevo');
    });
  });

  describe('fall-over and return to the primary', () => {
    it('falls over when the primary daily quota is used up and returns at the next Riyadh day', async () => {
      process.env.RESEND_DAILY_QUOTA = '1';
      const svc = makeService();
      expect((await svc.send('a@example.test', 's', '<p>x</p>')).provider).toBe('resend');
      expect(await svc.send('b@example.test', 's', '<p>x</p>')).toMatchObject({ provider: 'brevo', fallback_used: true });
      // 20:59 UTC is still the same Riyadh day; 21:00 UTC is the next one.
      svc.now = () => Date.parse('2026-01-15T20:59:00Z');
      expect((await svc.send('c@example.test', 's', '<p>x</p>')).provider).toBe('brevo');
      svc.now = () => Date.parse('2026-01-15T21:00:00Z');
      expect(await svc.send('d@example.test', 's', '<p>x</p>')).toMatchObject({ provider: 'resend', fallback_used: false });
      const resend = svc.providerState().find((s) => s.provider === 'resend');
      expect(resend).toMatchObject({ daily_used: 1, monthly_used: 2, daily_left: 0 });
    });

    it('an unset monthly quota means no monthly cap; MAIL_PROVIDER_ORDER defines the rotation set', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'brevo,mailjet';
      process.env.BREVO_DAILY_QUOTA = '300';
      const svc = makeService();
      expect(svc.chain()).toEqual(['brevo', 'mailjet']);
      expect(svc.primaryProvider(Date.parse('2026-02-10T09:00:00Z'))).toBe('mailjet');
      for (let i = 0; i < 3; i += 1) expect((await svc.send(`${i}@example.test`, 's', '<p>x</p>')).provider).toBe('brevo');
      expect(svc.providerState()[0]).toMatchObject({ provider: 'brevo', daily_quota: 300, monthly_quota: null, monthly_used: 3 });
    });

    it('falls over when the primary monthly quota is used up', async () => {
      process.env.RESEND_MONTHLY_QUOTA = '1';
      const svc = makeService();
      await svc.send('a@example.test', 's', '<p>x</p>');
      svc.now = () => JAN_15 + 3 * 86_400_000;
      expect((await svc.send('b@example.test', 's', '<p>x</p>')).provider).toBe('brevo');
    });

    it('falls over on failure, records the last error, cools down, then returns to the primary', async () => {
      failures.set('resend', async () => { throw new Error('resend_down'); });
      const svc = makeService();
      for (const to of ['a', 'b', 'c']) expect((await svc.send(`${to}@example.test`, 's', '<p>x</p>')).provider).toBe('brevo');
      const state = svc.providerState().find((s) => s.provider === 'resend');
      expect(state).toMatchObject({ consecutive_failures: 3, healthy: false, last_error: 'resend_down' });
      failures.delete('resend');
      sent = [];
      expect((await svc.send('d@example.test', 's', '<p>x</p>')).provider).toBe('brevo');
      expect(sent.map((s) => s.provider)).not.toContain('resend');
      svc.now = () => JAN_15 + 300_001;
      expect(await svc.send('e@example.test', 's', '<p>x</p>')).toMatchObject({ provider: 'resend', fallback_used: false });
    });
  });

  describe('REST transports', () => {
    const realFetch = global.fetch;
    afterEach(() => { global.fetch = realFetch; });
    const plain = () => new MailService(new EventEmitter2());

    it('Brevo posts to /v3/smtp/email with the api-key header', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'brevo';
      process.env.BREVO_FROM = 'Nabd <no-reply@example.test>';
      const fetchMock = jest.fn(async () => new Response(JSON.stringify({ messageId: 'm1' }), { status: 201 }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const r = await plain().sendWithAttachment({ to: 'u@example.test', subject: 'S', html: '<p>h</p>', text: 't', filename: 'r.csv', content: 'a,b' });
      expect(r).toEqual({ ok: true, provider: 'brevo', fallback_used: false });
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect((init.headers as Record<string, string>)['api-key']).toBe('k');
      expect(JSON.parse(String(init.body))).toEqual({
        sender: { email: 'no-reply@example.test', name: 'Nabd' }, to: [{ email: 'u@example.test' }], subject: 'S',
        htmlContent: '<p>h</p>', textContent: 't', attachment: [{ name: 'r.csv', content: Buffer.from('a,b').toString('base64') }],
      });
    });

    // gap 13: a PDF is binary. It used to go through Buffer.from(string, 'utf-8'), which replaces every byte that is not valid UTF-8.
    const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from([0xff, 0xfe, 0x80, 0x00, 0xc3, 0x28, 0xe2, 0x82]), Buffer.from('\n%%EOF')]);

    it('Brevo carries a PDF byte for byte, and several attachments', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'brevo';
      const fetchMock = jest.fn(async () => new Response(JSON.stringify({ messageId: 'm1' }), { status: 201 }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const r = await plain().sendWithAttachment({ to: 'u@example.test', subject: 'S', html: '<p>h</p>', attachments: [{ filename: 'contract-ar.pdf', content: PDF }, { filename: 'contract-en.pdf', content: PDF }] });
      expect(r.ok).toBe(true);
      const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
      expect(body.attachment.map((a: any) => a.name)).toEqual(['contract-ar.pdf', 'contract-en.pdf']);
      expect(Buffer.from(body.attachment[0].content, 'base64').equals(PDF)).toBe(true);
    });

    it('Mailjet carries a PDF byte for byte with the PDF content type', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'mailjet';
      const fetchMock = jest.fn(async () => new Response(JSON.stringify({ Messages: [{ Status: 'success' }] }), { status: 200 }));
      global.fetch = fetchMock as unknown as typeof fetch;
      await plain().sendWithAttachment({ to: 'u@example.test', subject: 'S', html: '<p>h</p>', filename: 'contract.pdf', content: PDF });
      const att = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)).Messages[0].Attachments[0];
      expect(att.ContentType).toBe('application/pdf');
      expect(Buffer.from(att.Base64Content, 'base64').equals(PDF)).toBe(true);
    });

    it('Brevo error is a failed send with its status', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'brevo';
      global.fetch = jest.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
      expect((await plain().send('u@example.test', 'S', '<p>h</p>')).error).toBe('brevo_http_401');
    });

    it('Mailjet posts to the v3.1 Send API with basic auth and uses the free-tier quota', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'mailjet';
      process.env.MAILJET_FROM = 'Nabd <no-reply@example.test>';
      const fetchMock = jest.fn(async () => new Response(JSON.stringify({ Messages: [{ Status: 'success' }] }), { status: 200 }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const svc = plain();
      expect(svc.providerState()[0]).toMatchObject({ provider: 'mailjet', daily_quota: 200, monthly_quota: null, monthly_left: null });
      const r = await svc.sendWithAttachment({ to: 'u@example.test', subject: 'S', html: '<p>h</p>', text: 't', filename: 'r.csv', content: 'a,b' });
      expect(r).toEqual({ ok: true, provider: 'mailjet', fallback_used: false });
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.mailjet.com/v3.1/send');
      expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('pub:sec').toString('base64')}`);
      expect(JSON.parse(String(init.body)).Messages[0]).toMatchObject({
        From: { Email: 'no-reply@example.test', Name: 'Nabd' }, To: [{ Email: 'u@example.test' }], Subject: 'S', HTMLPart: '<p>h</p>', TextPart: 't',
        Attachments: [{ Filename: 'r.csv', Base64Content: Buffer.from('a,b').toString('base64') }],
      });
    });

    it('Mailjet error is a failed send without throwing', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'mailjet';
      global.fetch = jest.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
      expect((await plain().send('u@example.test', 'S', '<p>h</p>')).error).toBe('mailjet_http_401');
    });

    it('base URLs are overridable for the test stack', async () => {
      process.env.MAIL_PROVIDER_ORDER = 'brevo,mailjet';
      process.env.BREVO_API_BASE = 'http://127.0.0.1:9200/brevo/v3';
      process.env.MAILJET_API_BASE = 'http://127.0.0.1:9200/mailjet/v3.1';
      const fetchMock = jest.fn(async (url: string) => (url.includes('brevo')
        ? new Response('{}', { status: 500 })
        : new Response(JSON.stringify({ Messages: [{ Status: 'success' }] }), { status: 200 })));
      global.fetch = fetchMock as unknown as typeof fetch;
      const svc = plain();
      svc.now = () => JAN_15;
      await svc.send('u@example.test', 'S', '<p>h</p>');
      expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['http://127.0.0.1:9200/brevo/v3/smtp/email', 'http://127.0.0.1:9200/mailjet/v3.1/send']);
    });
  });

  describe('shared state in Mongo', () => {
    let mongo: MongoMemoryServer;
    let conn: Connection;
    beforeAll(async () => {
      mongo = await MongoMemoryServer.create();
      conn = mongoose.createConnection(mongo.getUri());
      await conn.asPromise();
    });
    afterAll(async () => {
      await conn.close();
      await mongo.stop();
    });
    beforeEach(async () => { await conn.dropDatabase(); });

    it('keeps the counters after a restart (new instance on the same database), with the window start stored', async () => {
      process.env.RESEND_DAILY_QUOTA = '1';
      await makeService(conn).send('a@example.test', 's', '<p>x</p>');
      const restarted = makeService(conn);
      expect((await restarted.send('b@example.test', 's', '<p>x</p>')).provider).toBe('brevo');
      const state = await restarted.sharedProviderState();
      expect(state.find((s) => s.provider === 'resend')).toMatchObject({ daily_used: 1, monthly_used: 1, daily_left: 0 });
      const doc = await conn.collection('mail_quota').findOne({ provider: 'resend', window: 'daily' });
      expect(doc?.window_start).toEqual(new Date(riyadhWindows(JAN_15).dayStart));
    });

    it('shares the counters between two running instances (atomic $inc)', async () => {
      process.env.RESEND_DAILY_QUOTA = '10';
      const a = makeService(conn);
      const b = makeService(conn);
      await Promise.all([1, 2, 3, 4].map((i) => (i % 2 ? a : b).send(`${i}@example.test`, 's', '<p>x</p>')));
      const daily = await conn.collection('mail_quota').findOne({ provider: 'resend', window: 'daily' });
      expect(daily?.count).toBe(4);
      expect((await a.sharedProviderState()).find((s) => s.provider === 'resend')?.monthly_used).toBe(4);
    });

    it('shares the last error with the admin view of another instance', async () => {
      failures.set('resend', async () => { throw new Error('resend_http_500'); });
      await makeService(conn).send('a@example.test', 's', '<p>x</p>');
      const other = makeService(conn);
      expect((await other.sharedProviderState()).find((s) => s.provider === 'resend')?.last_error).toBe('resend_http_500');
    });

    it('keep-alive: once a week per non-primary provider, never the primary, not twice across two processes', async () => {
      process.env.OPS_ALERT_EMAIL = 'ops@example.test';
      const a = makeService(conn);
      const b = makeService(conn);
      await Promise.all([a.runKeepAlive(), b.runKeepAlive(), a.runKeepAlive()]);
      const keep = () => sent.filter((s) => s.to === 'ops@example.test').map((s) => s.provider).sort();
      expect(keep()).toEqual(['brevo', 'mailjet']);
      // Same week, after a restart: nothing more.
      await makeService(conn, JAN_15 + 2 * 86_400_000).runKeepAlive();
      expect(keep()).toEqual(['brevo', 'mailjet']);
      // Next week: once more each.
      await makeService(conn, JAN_15 + 7 * 86_400_000).runKeepAlive();
      expect(keep()).toEqual(['brevo', 'brevo', 'mailjet', 'mailjet']);
    });

    it('keep-alive retries a provider whose send failed', async () => {
      process.env.OPS_ALERT_EMAIL = 'ops@example.test';
      failures.set('mailjet', async () => { throw new Error('mailjet_down'); });
      const svc = makeService(conn);
      expect(await svc.runKeepAlive()).toEqual([{ provider: 'brevo', ok: true }, { provider: 'mailjet', ok: false, error: 'mailjet_down' }]);
      failures.delete('mailjet');
      expect(await svc.runKeepAlive()).toEqual([{ provider: 'mailjet', ok: true }]);
    });
  });

  it('brands the OTP email as Nabd+ and states the real expiry', async () => {
    const svc = new MailService(new EventEmitter2());
    const spy = jest.spyOn(svc, 'send').mockResolvedValue({ ok: true, provider: 'resend', fallback_used: false });
    await svc.sendOtp('u@example.test', '123456', 7);
    const [to, subject, html, text] = spy.mock.calls[0] as [string, string, string, string];
    expect(to).toBe('u@example.test');
    expect(subject).toContain('نبض بلس');
    expect(html).toContain('123456');
    expect(html).toContain('7');
    expect(text).toContain('123456');
  });
});
