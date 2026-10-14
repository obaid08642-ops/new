// ACCEPTANCE — D-34 the admin "Operations & Security" page, backend part (owner decision 34). Written by the reviewer
// before the work; the implementing agent makes it pass and may not edit it (nor live-server.ts next to it).
//
// Decision 34: one admin page, read-only for most admins, with five sections. It reports what happened; a backup
// failure also alerts the owner by e-mail. It never shows a secret value.
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis. E-mail goes through the
// real MailService over SMTP (MAIL_PROVIDER_ORDER=ses) to a fake SMTP server in this file.
//
// HTTP contract (all under /api/v1):
//   GET  /admin/ops-security            admin or super_admin (device-enrolled, as every admin route); 401/403 for
//                                       anyone else. Answers { backups, security, secrets, pdpl, incidents }:
//     backups:   { local, offsite, restore_test }, each { at, ok, size_bytes } of the newest run of that kind or null,
//                and `stale: true` when the newest successful local OR off-server backup is older than 26 h (or missing).
//     security:  { last_24h, last_7d }, each { failed_sign_ins, rate_limited, blocked_requests, new_admin_devices,
//                step_up_failures }: counts of events that really happened (wrong password, a 429, a request refused
//                by a security guard such as `device_not_enrolled`, an admin device enrolled, a failed step-up).
//     secrets:   [{ name, owner, last_rotated_at, stale }]: one row per secret the server is configured with (env
//                names that look like a secret: *SECRET*, *TOKEN*, *PASSWORD*, *PASS, *_KEY, *PRIVATE*, *DSN*), plus
//                any recorded name. `stale` when never recorded or older than 180 days. NEVER a value.
//     pdpl:      { requests: [{ id, type: 'export'|'delete', status, created_at }],
//                  record_access: [{ actor_id, actor_role, record_kind, record_id, at }] } (decision 22).
//     incidents: [{ id, title, status, started_at, note }].
//   POST /admin/ops-security/secrets/:name/rotated { owner? }  super_admin only: records today as the rotation date.
//   POST /admin/ops-security/incidents { title, status, note }  super_admin only; PATCH .../incidents/:id { status }.
//   POST /ops/backup-runs                the server-side backup scripts report a run (D-33 calls this). Auth:
//                                        `Authorization: Bearer <BACKUP_REPORT_TOKEN>` (env, 32+ chars), else 401.
//                                        Body { kind: 'local'|'offsite'|'restore_test'|'catalogue_export', ok,
//                                        size_bytes?, finished_at, error? }. A run with ok:false e-mails the owner
//                                        (OWNER_ALERT_EMAIL).
import * as net from 'net';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { LiveStack, JWT_SECRET, ADMIN_DEVICE } from './live-server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

jest.setTimeout(600_000);

const OWNER_EMAIL = 'owner.d34@example.test';
const SUPER_EMAIL = 'super.d34@example.test';
const BACKUP_REPORT_TOKEN = randomBytes(24).toString('hex');
const PROBE_SECRET_NAME = 'ACCEPTANCE_PROBE_SECRET';
const PROBE_SECRET = randomBytes(20).toString('hex');
const SMTP_PASS = randomBytes(12).toString('hex');
const PATIENT = { id: 'pat-d34', email: 'patient.d34@example.test', password: `Pw-${randomBytes(6).toString('hex')}` };
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// ───────────────────────────── fake SMTP (keeps every message) ─────────────────────────────
type Mail = { to: string[]; data: string };
const mails: Mail[] = [];
let smtp: net.Server;
let smtpPort = 0;
function startSmtp(): Promise<void> {
  smtp = net.createServer((sock) => {
    let mode: 'cmd' | 'data' | 'auth' = 'cmd';
    let buf = '';
    let cur: Mail = { to: [], data: '' };
    const send = (l: string) => sock.write(`${l}\r\n`);
    send('220 fake-smtp ready');
    sock.on('data', (chunk) => {
      buf += chunk.toString('latin1');
      for (;;) {
        if (mode === 'data') {
          const end = buf.indexOf('\r\n.\r\n');
          if (end < 0) return;
          cur.data = buf.slice(0, end);
          buf = buf.slice(end + 5);
          mails.push(cur);
          cur = { to: [], data: '' };
          mode = 'cmd';
          send('250 queued');
          continue;
        }
        const i = buf.indexOf('\r\n');
        if (i < 0) return;
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (mode === 'auth') { mode = 'cmd'; send('235 ok'); continue; }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO') sock.write('250-fake-smtp\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
        else if (cmd === 'HELO') send('250 fake-smtp');
        else if (cmd === 'AUTH') {
          if (/^AUTH PLAIN \S+/i.test(line)) send('235 ok');
          else { mode = 'auth'; send('334 '); }
        }
        else if (cmd === 'MAIL') send('250 ok');
        else if (cmd === 'RCPT') { cur.to.push(line.replace(/^RCPT TO:\s*<?([^>]*)>?.*$/i, '$1').toLowerCase()); send('250 ok'); }
        else if (cmd === 'DATA') { mode = 'data'; send('354 go'); }
        else if (cmd === 'QUIT') { send('221 bye'); sock.end(); }
        else send('250 ok');
      }
    });
    sock.on('error', () => undefined);
  });
  return new Promise((resolve) => smtp.listen(0, '127.0.0.1', () => { smtpPort = (smtp.address() as net.AddressInfo).port; resolve(); }));
}
const mailsTo = (email: string) => mails.filter((m) => m.to.includes(email.toLowerCase()));

// ───────────────────────────── stack and helpers ─────────────────────────────
const stack = new LiveStack();
let superToken = '';
let adminToken = '';
let patientToken = '';
const ADMIN_ID = 'adm-d34-plain';

async function req(method: string, p: string, opts: { token?: string; device?: string; body?: unknown; bearer?: string } = {}) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'idempotency-key': `acc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  };
  if (opts.token) { headers.authorization = `Bearer ${opts.token}`; headers['x-admin-device'] = opts.device ?? ADMIN_DEVICE; }
  if (opts.bearer !== undefined) headers.authorization = `Bearer ${opts.bearer}`;
  const res = await fetch(`${stack.servers[0].url}/api/v1${p}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, text };
}
const keepAlive = async (...ids: string[]) => {
  const r = new Redis(stack.redisPort, '127.0.0.1');
  for (const id of ids) await r.set(`admin_activity:${id}`, String(Date.now()), 'EX', 900);
  r.disconnect();
};
async function page(token = superToken) {
  const r = await req('GET', '/admin/ops-security', { token });
  expect(r.status).toBe(200);
  return r;
}
const sec = (body: any, window: 'last_24h' | 'last_7d', key: string) => Number(body?.security?.[window]?.[key] ?? NaN);
const report = (body: Record<string, unknown>, bearer = BACKUP_REPORT_TOKEN) => req('POST', '/ops/backup-runs', { bearer, body });

beforeAll(async () => {
  await startSmtp();
  LiveStack.build();
  await stack.start(1, undefined, {
    MAIL_PROVIDER_ORDER: 'ses',
    SES_SMTP_HOST: '127.0.0.1',
    SES_SMTP_PORT: String(smtpPort),
    SES_SMTP_USER: `u${randomBytes(4).toString('hex')}`,
    SES_SMTP_PASS: SMTP_PASS,
    SES_FROM: 'no-reply@nabd-acceptance.test',
    OWNER_ALERT_EMAIL: OWNER_EMAIL,
    BACKUP_REPORT_TOKEN,
    [PROBE_SECRET_NAME]: PROBE_SECRET,
  });
  superToken = await stack.admin('adm-d34');
  await stack.db.collection('users').updateOne({ id: 'adm-d34' }, { $set: { email: SUPER_EMAIL } });
  // a plain `admin` (not super_admin): reads the page, cannot write to it
  await stack.db.collection('users').updateOne({ id: ADMIN_ID }, { $set: { id: ADMIN_ID, full_name: 'Plain Admin', role: 'admin', active: true } }, { upsert: true });
  await stack.db.collection('admin_devices').insertOne({ user_id: ADMIN_ID, device_hash: createHash('sha256').update(ADMIN_DEVICE).digest('hex'), revoked: false, enrolled_at: new Date(Date.now() - 30 * DAY) });
  adminToken = new JwtService({ secret: JWT_SECRET }).sign({ id: ADMIN_ID, sub: ADMIN_ID, role: 'admin' });
  await stack.db.collection('users').updateOne({ id: PATIENT.id }, { $set: { id: PATIENT.id, full_name: 'Patient D34', role: 'patient', active: true, email: PATIENT.email, password_hash: await bcrypt.hash(PATIENT.password, 10) } }, { upsert: true });
  patientToken = new JwtService({ secret: JWT_SECRET }).sign({ id: PATIENT.id, sub: PATIENT.id, role: 'patient' });
});
afterAll(async () => {
  await stack.stop();
  smtp?.close();
});
beforeEach(async () => { await keepAlive('adm-d34', ADMIN_ID); });

describe('D-34 Operations & Security page (backend)', () => {
  it('1. admins read it; a patient or an anonymous caller cannot', async () => {
    const page1 = await page(superToken);
    for (const k of ['backups', 'security', 'secrets', 'pdpl', 'incidents']) expect(page1.body).toHaveProperty(k);
    expect((await req('GET', '/admin/ops-security', { token: adminToken })).status).toBe(200);
    expect([401, 403]).toContain((await req('GET', '/admin/ops-security', { bearer: patientToken })).status);
    expect([401, 403]).toContain((await req('GET', '/admin/ops-security')).status);
  });

  it('2. backups: the scripts report runs with their own token; the page shows the newest of each kind', async () => {
    expect((await report({ kind: 'local', ok: true, size_bytes: 1, finished_at: new Date().toISOString() }, 'wrong-token')).status).toBe(401);
    expect((await report({ kind: 'local', ok: true, size_bytes: 1, finished_at: new Date().toISOString() }, '')).status).toBe(401);
    expect((await page()).body.backups.stale).toBe(true); // nothing reported yet

    const t = (ms: number) => new Date(Date.now() - ms).toISOString();
    for (const run of [
      { kind: 'local', ok: true, size_bytes: 1_000, finished_at: t(50 * HOUR) },
      { kind: 'local', ok: true, size_bytes: 734_003_200, finished_at: t(2 * HOUR) },
      { kind: 'offsite', ok: true, size_bytes: 734_003_200, finished_at: t(3 * HOUR) },
      { kind: 'restore_test', ok: true, finished_at: t(10 * DAY) },
    ]) expect((await report(run)).status).toBeLessThan(300);

    const b = (await page()).body.backups;
    expect(b.local.size_bytes).toBe(734_003_200);
    expect(new Date(b.local.at).getTime()).toBeGreaterThan(Date.now() - 3 * HOUR);
    expect(b.offsite.ok).toBe(true);
    expect(b.restore_test.ok).toBe(true);
    expect(b.stale).toBe(false);
  });

  it('3. backups: red when the newest off-server copy is older than 26 h', async () => {
    await stack.db.collection('backup_runs').deleteMany({ kind: 'offsite' });
    expect((await report({ kind: 'offsite', ok: true, size_bytes: 5, finished_at: new Date(Date.now() - 27 * HOUR).toISOString() })).status).toBeLessThan(300);
    expect((await page()).body.backups.stale).toBe(true);
    expect((await report({ kind: 'offsite', ok: true, size_bytes: 6, finished_at: new Date().toISOString() })).status).toBeLessThan(300);
    expect((await page()).body.backups.stale).toBe(false);
  });

  it('4. a failed backup e-mails the owner and shows as failed', async () => {
    const before = mailsTo(OWNER_EMAIL).length;
    expect((await report({ kind: 'offsite', ok: false, finished_at: new Date().toISOString(), error: 'upload refused' })).status).toBeLessThan(300);
    const until = Date.now() + 20_000;
    while (mailsTo(OWNER_EMAIL).length === before && Date.now() < until) await new Promise((r) => setTimeout(r, 250));
    expect(mailsTo(OWNER_EMAIL).length).toBeGreaterThan(before);
    expect((await page()).body.backups.offsite.ok).toBe(false);
  });

  it('5. security: the counters move with what really happens', async () => {
    const before = (await page()).body;

    // failed sign-ins: three wrong passwords
    for (let i = 0; i < 3; i++) {
      const r = await req('POST', '/auth/login', { body: { identifier: PATIENT.email, password: `wrong-${i}-${randomBytes(3).toString('hex')}` } });
      expect([400, 401]).toContain(r.status);
    }
    // blocked: an admin call from a device that is not enrolled
    expect((await req('GET', '/admin/audit', { token: superToken, device: `unknown-${randomBytes(10).toString('hex')}` })).status).toBe(403);
    // a new admin device enrolled now
    await stack.db.collection('admin_devices').insertOne({ user_id: ADMIN_ID, device_hash: createHash('sha256').update(`new-${randomBytes(8).toString('hex')}`).digest('hex'), revoked: false, enrolled_at: new Date() });
    // failed step-ups until the throttle answers 429
    let saw429 = false;
    let failedStepUps = 0;
    for (let i = 0; i < 14 && !saw429; i++) {
      const r = await req('POST', '/auth/step-up/issue', { body: { identifier: SUPER_EMAIL, action: 'admin.refund', response: { id: 'bogus', rawId: 'bogus', type: 'public-key', response: {} } } });
      if (r.status === 429) saw429 = true; else { expect(r.status).toBeGreaterThanOrEqual(400); failedStepUps++; }
    }
    expect(saw429).toBe(true);

    const after = (await page()).body;
    for (const w of ['last_24h', 'last_7d'] as const) {
      expect(sec(after, w, 'failed_sign_ins') - sec(before, w, 'failed_sign_ins')).toBeGreaterThanOrEqual(3);
      expect(sec(after, w, 'blocked_requests') - sec(before, w, 'blocked_requests')).toBeGreaterThanOrEqual(1);
      expect(sec(after, w, 'new_admin_devices') - sec(before, w, 'new_admin_devices')).toBeGreaterThanOrEqual(1);
      expect(sec(after, w, 'rate_limited') - sec(before, w, 'rate_limited')).toBeGreaterThanOrEqual(1);
      expect(sec(after, w, 'step_up_failures') - sec(before, w, 'step_up_failures')).toBeGreaterThanOrEqual(1);
    }
    // the 30-day-old device seeded in beforeAll is outside both windows
    expect(sec(after, 'last_24h', 'new_admin_devices')).toBeLessThanOrEqual(sec(after, 'last_7d', 'new_admin_devices'));
  });

  it('6. secrets: names, owner and rotation date, stale after 180 days, and never a value', async () => {
    await stack.db.collection('secret_rotations').deleteMany({});
    const s0 = (await page()).body.secrets as any[];
    const probe = s0.find((r) => r.name === PROBE_SECRET_NAME);
    expect(probe).toBeDefined();
    expect(probe.stale).toBe(true); // never recorded
    expect(s0.some((r) => r.name === 'JWT_SECRET')).toBe(true);
    expect(s0.some((r) => r.name === 'BACKUP_REPORT_TOKEN')).toBe(true);

    // a plain admin cannot record a rotation
    expect([401, 403]).toContain((await req('POST', `/admin/ops-security/secrets/${PROBE_SECRET_NAME}/rotated`, { token: adminToken, body: { owner: 'owner' } })).status);
    expect((await req('POST', `/admin/ops-security/secrets/${PROBE_SECRET_NAME}/rotated`, { token: superToken, body: { owner: 'owner' } })).status).toBeLessThan(300);
    const s1 = (await page()).body.secrets as any[];
    const rotated = s1.find((r) => r.name === PROBE_SECRET_NAME);
    expect(rotated.stale).toBe(false);
    expect(rotated.owner).toBe('owner');
    expect(new Date(rotated.last_rotated_at).getTime()).toBeGreaterThan(Date.now() - HOUR);

    // a rotation recorded 200 days ago is stale
    await stack.db.collection('secret_rotations').updateMany({ name: PROBE_SECRET_NAME }, { $set: { last_rotated_at: new Date(Date.now() - 200 * DAY) } });
    expect(((await page()).body.secrets as any[]).find((r) => r.name === PROBE_SECRET_NAME).stale).toBe(true);

    // no value anywhere on the page, for anyone
    for (const tok of [superToken, adminToken]) {
      const text = (await page(tok)).text;
      for (const value of [PROBE_SECRET, JWT_SECRET, `${JWT_SECRET}-refresh`, SMTP_PASS, BACKUP_REPORT_TOKEN]) expect(text).not.toContain(value);
    }
  });

  it('7. PDPL: export and erasure requests with their status, and who read which health record', async () => {
    expect((await req('POST', '/privacy/requests', { bearer: patientToken, body: { type: 'export' } })).status).toBeLessThan(300);
    expect((await req('POST', '/privacy/requests', { bearer: patientToken, body: { type: 'delete' } })).status).toBeLessThan(300);
    // a health record read by an admin
    const created = await req('POST', '/medical-reports', { token: adminToken, body: { patient_id: PATIENT.id, title_ar: 'تقرير', report_type: 'clinic_note' } });
    expect(created.status).toBeLessThan(300);
    const reportId = String(created.body?.id || '');
    expect(reportId).not.toBe('');
    expect((await req('GET', `/medical-reports/${reportId}`, { token: adminToken })).status).toBe(200);

    const pdpl = (await page()).body.pdpl;
    const types = (pdpl.requests as any[]).map((r) => r.type).sort();
    expect(types).toEqual(expect.arrayContaining(['delete', 'export']));
    expect((pdpl.requests as any[]).every((r) => typeof r.status === 'string' && r.status.length > 0)).toBe(true);
    const read = (pdpl.record_access as any[]).find((r) => r.record_id === reportId);
    expect(read).toBeDefined();
    expect(read.actor_id).toBe(ADMIN_ID);
    expect(read.record_kind).toBe('medical_report');
    expect(read.at).toBeTruthy();
  });

  it('8. incidents: super_admin records one and changes its status; a plain admin only reads', async () => {
    const body = { title: 'Server unreachable', status: 'open', note: 'docs/deploy/INCIDENT_2026-10-14.md' };
    expect([401, 403]).toContain((await req('POST', '/admin/ops-security/incidents', { token: adminToken, body })).status);
    const created = await req('POST', '/admin/ops-security/incidents', { token: superToken, body });
    expect(created.status).toBeLessThan(300);
    const id = String(created.body?.id || '');
    expect(id).not.toBe('');
    expect((await req('PATCH', `/admin/ops-security/incidents/${id}`, { token: superToken, body: { status: 'resolved' } })).status).toBeLessThan(300);
    const list = (await page(adminToken)).body.incidents as any[];
    const row = list.find((r) => r.id === id);
    expect(row).toMatchObject({ title: body.title, status: 'resolved', note: body.note });
    expect(row.started_at).toBeTruthy();
  });
});
