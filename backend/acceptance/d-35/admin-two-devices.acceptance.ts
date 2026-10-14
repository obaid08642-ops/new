// ACCEPTANCE — D-35 admin on two devices (owner, 2026-10-14 queue). Written by the reviewer before the work; the
// implementing agent makes it pass and may not edit it (nor live-server.ts next to it).
//
// Owner rule: "At most 2 active enrolled admin devices per admin (the owner's iPhone and MacBook). A third device is
// refused until one is revoked. Enrolling a new device needs approval from an already-enrolled device plus email
// step-up. Every enrolment and revoke is audit-logged and shown on the decision-34 page."
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis. E-mail goes through the
// real MailService over SMTP (MAIL_PROVIDER_ORDER=ses) to a fake SMTP server in this file, which keeps every message.
//
// HTTP contract (all under /api/v1, admin JWT, the device id in the `x-admin-device` header as today):
//   POST   /admin/devices/enroll                      from the NEW device. Never enrols on its own:
//                                                     202 { status: 'pending_approval', request_id } and an e-mail with
//                                                     a one-time code (6 to 8 digits) to the admin's address.
//                                                     409 { message: 'admin_device_limit' } when 2 devices are active
//                                                     (no request, no e-mail). A new request from the same
//                                                     device replaces its older open one (new id, new code).
//   GET    /admin/devices/requests                    from an ENROLLED device: the open requests (request_id, name,
//                                                     created_at). Never the code and never the raw device id.
//   POST   /admin/devices/requests/:id/approve        from an ENROLLED device (not the requesting one).
//   POST   /admin/devices/requests/:id/confirm {code} from the NEW device: enrols it only when the request is
//                                                     approved AND the code matches (409 'approval_required' before
//                                                     the approval; a wrong code enrols nothing). The admin's FIRST
//                                                     device (none active) needs only the code: there is no device
//                                                     to approve it.
//   GET    /admin/devices                             each active device carries an `id` that DELETE accepts.
//   DELETE /admin/devices/:id                         revokes it; another admin cannot revoke it.
// Every path that enrols (enroll+confirm, the device-lock switch, the passkey login) respects the limit of 2.
// Audit: `audit_logs` rows with action `admin_device.enrolled` and `admin_device.revoked` (user_id = the admin), never
// the raw device id.
import * as net from 'net';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { LiveStack, JWT_SECRET, ADMIN_DEVICE } from './live-server';

jest.setTimeout(600_000);

const ADMIN = { id: 'adm-d35', email: 'owner.d35@example.test' };
const OTHER_ADMIN = { id: 'adm-d35-other', email: 'other.d35@example.test' };
const MACBOOK = ADMIN_DEVICE; // enrolled by the seed
const IPHONE = `iphone-${randomBytes(12).toString('hex')}`;
const THIRD = `ipad-${randomBytes(12).toString('hex')}`;
const FRESH = `fresh-${randomBytes(12).toString('hex')}`;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

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

/** Decodes quoted-printable / base64 bodies well enough to find the code. */
function mailText(m: Mail): string {
  const raw = m.data.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const decoded = raw.split(/\r\n\r\n/).map((part) => {
    const compact = part.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]{24,}$/.test(compact)) {
      try { return Buffer.from(compact, 'base64').toString('utf8'); } catch { return part; }
    }
    return part;
  });
  return [raw, ...decoded].join('\n');
}
const mailsTo = (email: string) => mails.filter((m) => m.to.includes(email.toLowerCase()));
function latestCode(email: string): string {
  const list = mailsTo(email);
  expect(list.length).toBeGreaterThan(0);
  const text = mailText(list[list.length - 1]);
  const m = /(?<![0-9])([0-9]{6,8})(?![0-9])/.exec(text.replace(/<[^>]+>/g, ' '));
  if (!m) throw new Error(`no 6-8 digit code in the last e-mail to ${email}`);
  return m[1];
}

// ───────────────────────────── stack ─────────────────────────────
const stack = new LiveStack();
let token = '';
let otherToken = '';

async function as(device: string, method: string, p: string, body?: unknown, tok = token) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${tok}`,
    'x-admin-device': device,
    'idempotency-key': `acc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  };
  const res = await fetch(`${stack.servers[0].url}/api/v1${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const activeCount = async (userId = ADMIN.id) => stack.db.collection('admin_devices').countDocuments({ user_id: userId, revoked: { $ne: true } });
const isEnrolled = async (device: string, userId = ADMIN.id) =>
  !!(await stack.db.collection('admin_devices').findOne({ user_id: userId, device_hash: sha(device), revoked: { $ne: true } }));
/** A plain admin read: 403 device_not_enrolled from a device that is not enrolled. */
const canUseAdmin = async (device: string) => (await as(device, 'GET', '/admin/audit')).status !== 403;
const keepAlive = async (id: string) => {
  const r = new Redis(stack.redisPort, '127.0.0.1');
  await r.set(`admin_activity:${id}`, String(Date.now()), 'EX', 900);
  r.disconnect();
};

/** The whole new-device flow: request from `device`, approve from `approver`, confirm with the e-mailed code. */
async function enrolWithApproval(device: string, approver: string) {
  const req = await as(device, 'POST', '/admin/devices/enroll', { device_id: device, name: 'New device' });
  expect(req.status).toBe(202);
  expect(req.body?.status).toBe('pending_approval');
  const requestId = String(req.body?.request_id || '');
  expect(requestId).not.toBe('');
  const approve = await as(approver, 'POST', `/admin/devices/requests/${requestId}/approve`);
  expect(approve.status).toBeLessThan(300);
  const confirm = await as(device, 'POST', `/admin/devices/requests/${requestId}/confirm`, { code: latestCode(ADMIN.email) });
  expect(confirm.status).toBeLessThan(300);
  return requestId;
}

beforeAll(async () => {
  await startSmtp();
  LiveStack.build();
  await stack.start(1, undefined, {
    MAIL_PROVIDER_ORDER: 'ses',
    SES_SMTP_HOST: '127.0.0.1',
    SES_SMTP_PORT: String(smtpPort),
    SES_SMTP_USER: `u${randomBytes(4).toString('hex')}`,
    SES_SMTP_PASS: randomBytes(12).toString('hex'),
    SES_FROM: 'no-reply@nabd-acceptance.test',
  });
  token = await stack.admin(ADMIN.id); // enrols MACBOOK
  otherToken = await stack.admin(OTHER_ADMIN.id);
  await stack.db.collection('users').updateOne({ id: ADMIN.id }, { $set: { email: ADMIN.email, device_lock_enabled: true } });
  await stack.db.collection('users').updateOne({ id: OTHER_ADMIN.id }, { $set: { email: OTHER_ADMIN.email, device_lock_enabled: true } });
});
afterAll(async () => {
  await stack.stop();
  smtp?.close();
});
beforeEach(async () => { await keepAlive(ADMIN.id); await keepAlive(OTHER_ADMIN.id); });

describe('D-35 admin on two devices', () => {
  it('1. a new device is never enrolled by asking: it waits for approval and an e-mailed code', async () => {
    const before = mailsTo(ADMIN.email).length;
    const req = await as(IPHONE, 'POST', '/admin/devices/enroll', { device_id: IPHONE, name: 'iPhone' });
    expect(req.status).toBe(202);
    expect(req.body?.status).toBe('pending_approval');
    expect(await isEnrolled(IPHONE)).toBe(false);
    expect(await canUseAdmin(IPHONE)).toBe(false);
    expect(mailsTo(ADMIN.email).length).toBe(before + 1);
    latestCode(ADMIN.email);
  });

  it('2. the code alone is not enough, and the requesting device cannot approve itself', async () => {
    const req = await as(IPHONE, 'POST', '/admin/devices/enroll', { device_id: IPHONE, name: 'iPhone' });
    const requestId = String(req.body?.request_id || '');
    const early = await as(IPHONE, 'POST', `/admin/devices/requests/${requestId}/confirm`, { code: latestCode(ADMIN.email) });
    expect(early.status).toBe(409);
    expect(JSON.stringify(early.body)).toContain('approval_required');
    const self = await as(IPHONE, 'POST', `/admin/devices/requests/${requestId}/approve`);
    expect([401, 403]).toContain(self.status);
    expect(await isEnrolled(IPHONE)).toBe(false);
  });

  it('3. the open requests are listed on an enrolled device, without the code or the raw device id', async () => {
    const list = await as(MACBOOK, 'GET', '/admin/devices/requests');
    expect(list.status).toBe(200);
    const rows: any[] = Array.isArray(list.body) ? list.body : list.body?.items || list.body?.data || [];
    expect(rows.length).toBeGreaterThan(0);
    const text = JSON.stringify(rows);
    expect(text).not.toContain(IPHONE);
    expect(text).not.toContain(latestCode(ADMIN.email));
    expect(rows.every((r) => r.request_id || r.id)).toBe(true);
    const fromNew = await as(IPHONE, 'GET', '/admin/devices/requests');
    expect([401, 403]).toContain(fromNew.status);
  });

  it('4. approval from an enrolled device plus a wrong code still enrols nothing', async () => {
    const req = await as(IPHONE, 'POST', '/admin/devices/enroll', { device_id: IPHONE, name: 'iPhone' });
    const requestId = String(req.body?.request_id || '');
    expect((await as(MACBOOK, 'POST', `/admin/devices/requests/${requestId}/approve`)).status).toBeLessThan(300);
    const real = latestCode(ADMIN.email);
    const wrong = real === '000000' ? '111111' : '000000';
    const bad = await as(IPHONE, 'POST', `/admin/devices/requests/${requestId}/confirm`, { code: wrong });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    expect(await isEnrolled(IPHONE)).toBe(false);
  });

  it('5. approval from an enrolled device plus the right code enrols the second device', async () => {
    await enrolWithApproval(IPHONE, MACBOOK);
    expect(await isEnrolled(IPHONE)).toBe(true);
    expect(await canUseAdmin(IPHONE)).toBe(true);
    expect(await activeCount()).toBe(2);
  });

  it('6. a third device is refused while two are active: no request, no e-mail, no enrolment on any path', async () => {
    const before = mailsTo(ADMIN.email).length;
    const r = await as(THIRD, 'POST', '/admin/devices/enroll', { device_id: THIRD, name: 'iPad' });
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).toContain('admin_device_limit');
    expect(mailsTo(ADMIN.email).length).toBe(before);
    // the device-lock switch auto-enrols the presenting device today; it must respect the limit too
    await as(THIRD, 'POST', '/admin/devices/lock', { enabled: true });
    expect(await isEnrolled(THIRD)).toBe(false);
    expect(await activeCount()).toBe(2);
    expect(await canUseAdmin(THIRD)).toBe(false);
  });

  it('7. each listed device has an id that revokes it; another admin cannot revoke it', async () => {
    const list = await as(MACBOOK, 'GET', '/admin/devices');
    expect(list.status).toBe(200);
    const rows: any[] = Array.isArray(list.body) ? list.body : list.body?.items || list.body?.data || [];
    expect(rows.length).toBe(2);
    expect(rows.every((r) => typeof r.id === 'string' && r.id.length > 0)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(IPHONE);
    const iphoneRow = await stack.db.collection('admin_devices').findOne({ user_id: ADMIN.id, device_hash: sha(IPHONE) });
    const target = rows.find((r) => r.id === String(iphoneRow?.id ?? iphoneRow?._id));
    expect(target).toBeDefined();

    const foreign = await as(ADMIN_DEVICE, 'DELETE', `/admin/devices/${target.id}`, undefined, otherToken);
    expect(foreign.status).toBeLessThan(500);
    expect(await isEnrolled(IPHONE)).toBe(true);

    const own = await as(MACBOOK, 'DELETE', `/admin/devices/${target.id}`);
    expect(own.status).toBeLessThan(300);
    expect(await isEnrolled(IPHONE)).toBe(false);
    expect(await canUseAdmin(IPHONE)).toBe(false);
    expect(await activeCount()).toBe(1);
  });

  it('8. after a revoke the free slot can be used again (with approval and code)', async () => {
    await enrolWithApproval(THIRD, MACBOOK);
    expect(await isEnrolled(THIRD)).toBe(true);
    expect(await activeCount()).toBe(2);
  });

  it("9. an admin's first device needs only the e-mailed code (nothing can approve it)", async () => {
    const id = 'adm-d35-first';
    const email = 'first.d35@example.test';
    await stack.db.collection('users').updateOne({ id }, { $set: { id, full_name: 'First Admin', role: 'super_admin', active: true, email, device_lock_enabled: true } }, { upsert: true });
    await keepAlive(id);
    const firstToken = new JwtService({ secret: JWT_SECRET }).sign({ id, sub: id, role: 'super_admin' });
    const req = await as(FRESH, 'POST', '/admin/devices/enroll', { device_id: FRESH, name: 'MacBook' }, firstToken);
    expect(req.status).toBe(202);
    expect(await isEnrolled(FRESH, id)).toBe(false);
    const confirm = await as(FRESH, 'POST', `/admin/devices/requests/${req.body?.request_id}/confirm`, { code: latestCode(email) }, firstToken);
    expect(confirm.status).toBeLessThan(300);
    expect(await isEnrolled(FRESH, id)).toBe(true);
  });

  it('10. every enrolment and revoke is in the audit trail, without the raw device id', async () => {
    const rows = await stack.db.collection('audit_logs').find({ user_id: ADMIN.id, action: { $in: ['admin_device.enrolled', 'admin_device.revoked'] } }).toArray();
    const enrolled = rows.filter((r) => r.action === 'admin_device.enrolled');
    const revoked = rows.filter((r) => r.action === 'admin_device.revoked');
    expect(enrolled.length).toBeGreaterThanOrEqual(2); // IPHONE (case 5) and THIRD (case 8)
    expect(revoked.length).toBeGreaterThanOrEqual(1); // IPHONE (case 7)
    const text = JSON.stringify(rows);
    for (const raw of [IPHONE, THIRD]) expect(text).not.toContain(raw);
  });
});
