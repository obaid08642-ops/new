// ACCEPTANCE — D-32 files: replacing or deleting a file removes the old object (owner instruction 2026-10-08,
// decision 32). Written by the reviewer before the work; the implementing agent makes it pass and may not
// edit it (nor live-server.ts next to it).
//
// Owner rule: "Replacing or deleting ANY image or file removes the old object from storage, for every kind
// of file."
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis. Object storage is
// faked in this file:
//   - R2 (S3 API, path style) — S3_ENDPOINT points at a local fake that keeps every PUT object until it is
//     DELETEd (single DELETE or POST ?delete). S3_PUBLIC_BASE_URL is a CDN-style host distinct from the
//     endpoint, as in production.
//   - Cloudinary — CLOUDINARY_URL carries `upload_prefix=http://127.0.0.1:<port>`, so the real cloudinary SDK
//     sends upload/destroy (and admin delete_resources) to a local fake that keeps every live asset per
//     (resource_type, type, public_id) together with the hash of its content. A destroy only removes the
//     asset of the delivery type it names (Cloudinary's default type is `upload`).
// Every key and secret is generated per run.
//
// Required (each case uploads through the real route the app/admin uses, checks the object exists in the
// fake, then replaces or deletes it through the real route):
//   1. Media files (POST /media/upload → R2 + `media_assets` row):
//      a. an admin deleting a file (DELETE /media/<key>) removes the R2 object AND its `media_assets` row;
//      b. the owner can delete their own file by the id the upload returned (DELETE /media/<id>): object and
//         row are removed; another patient cannot delete it.
//   2. Patient avatar: uploading a new avatar (POST /media/upload purpose `avatar`) and setting it
//      (PATCH /users/me/profile, avatar_url = `media:<id>`, the `media:<id>` reference the server uses for
//      patient media) removes the previous avatar's R2 object and its `media_assets` row.
//   3. Doctor profile photo (POST /provider/profile/image/upload, processed to Cloudinary; admin
//      POST /admin/providers/:id/replace-image): after a replacement no asset with the old content is live
//      in Cloudinary, the old `storage_objects` rows are gone or marked deleted, and no
//      `image_processing_jobs` row keeps the raw `data_base64` once processed.
//   4. Provider KYC document replaced (POST /provider/kyc/documents, same doc_type twice): the old R2 object
//      is deleted and its `storage_objects` row is gone or marked deleted.
//   5. Provider clinic gallery and logo (POST /storage/upload, then POST /provider/settings/delta approved by
//      POST /admin/providers/provider-deltas/:id/approve): a removed or replaced image's R2 object is deleted
//      and its row is gone or marked deleted; images still in use stay.
//   6. Medicine image (admin: POST /storage/upload + GET /storage/:id/signed-url, then
//      PATCH /medicines/admin/catalog/:id): replacing the main image or removing a gallery image deletes the
//      old R2 object.
//   7. Chat attachment: deleting a message (DELETE /chat/messages/:id) removes its attachments' R2 objects and
//      `media_assets` rows.
//   Gaps (no delete/replace route exists today; each test names the route it expects and fails until it
//   exists and removes the file):
//   G1. Patient prescription photo (POST /prescriptions/upload, stored inline in `prescriptions.upload_image`):
//       the patient deleting the prescription (DELETE /prescriptions/:id) removes the photo.
//   G2. Return / complaint evidence (`media:<id>` in a return request): the patient withdrawing the return
//       (DELETE /pharmacy/returns/:id) removes the evidence's R2 objects and `media_assets` rows.
import * as http from 'http';
import { AddressInfo } from 'net';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

jest.setTimeout(900_000);

const BUCKET = `nabd-acc-${randomBytes(4).toString('hex')}`;
const S3_KEY_ID = randomBytes(10).toString('hex');
const S3_SECRET = randomBytes(24).toString('hex');
const CLOUD = `cloud${randomBytes(4).toString('hex')}`;
const CL_KEY = String(100000000 + Math.floor(Math.random() * 800000000));
const CL_SECRET = randomBytes(18).toString('hex');
const PUBLIC_BASE = 'https://media.nabd-acceptance.test';

const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

// ───────────────────────────── multipart parsing (both fakes) ─────────────────────────────
function parseMultipart(raw: Buffer, contentType: string): Record<string, string> {
  const m = /boundary=([^;]+)/i.exec(contentType || '');
  const out: Record<string, string> = {};
  if (!m) return out;
  const boundary = `--${m[1].replace(/^"|"$/g, '')}`;
  for (const part of raw.toString('latin1').split(boundary)) {
    const idx = part.indexOf('\r\n\r\n');
    if (idx < 0) continue;
    const name = /name="([^"]+)"/.exec(part.slice(0, idx));
    if (!name) continue;
    let body = part.slice(idx + 4);
    if (body.endsWith('\r\n')) body = body.slice(0, -2);
    out[name[1]] = Buffer.from(body, 'latin1').toString('utf8');
  }
  return out;
}
function parseForm(raw: Buffer, contentType: string): Record<string, string> {
  if (/multipart\/form-data/i.test(contentType || '')) return parseMultipart(raw, contentType);
  if (/json/i.test(contentType || '')) { try { return JSON.parse(raw.toString('utf8') || '{}'); } catch { return {}; } }
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw.toString('utf8'))) out[k] = v;
  return out;
}

// ───────────────────────────── fake R2 (S3 API, path style) ─────────────────────────────
class FakeS3 {
  server!: http.Server;
  objects = new Map<string, { sha: string; body: Buffer; type: string }>();
  deleted: string[] = [];
  get endpoint() { return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`; }

  private decodeChunked(buf: Buffer): Buffer {
    const parts: Buffer[] = [];
    let i = 0;
    for (;;) {
      const eol = buf.indexOf('\r\n', i);
      if (eol < 0) break;
      const size = parseInt(buf.slice(i, eol).toString('latin1').split(';')[0], 16);
      if (!size) break;
      parts.push(buf.slice(eol + 2, eol + 2 + size));
      i = eol + 2 + size + 2;
    }
    return Buffer.concat(parts);
  }

  async start() {
    this.server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const url = new URL(String(req.url), 'http://x');
        const segs = url.pathname.split('/').filter((s, i) => i > 0);
        const bucket = decodeURIComponent(segs[0] || '');
        const key = segs.slice(1).map((s) => decodeURIComponent(s)).join('/');
        let body: Buffer = Buffer.concat(chunks);
        if (bucket !== BUCKET) { res.writeHead(404, { 'content-type': 'application/xml' }); res.end('<Error><Code>NoSuchBucket</Code></Error>'); return; }
        if (req.method === 'PUT' && key) {
          const enc = String(req.headers['content-encoding'] || '');
          const csha = String(req.headers['x-amz-content-sha256'] || '');
          if (enc.includes('aws-chunked') || csha.startsWith('STREAMING') || req.headers['x-amz-decoded-content-length']) body = this.decodeChunked(body);
          this.objects.set(key, { sha: sha(body), body, type: String(req.headers['content-type'] || 'application/octet-stream') });
          res.writeHead(200, { etag: `"${sha(body).slice(0, 32)}"` });
          res.end();
          return;
        }
        if (req.method === 'POST' && url.searchParams.has('delete')) {
          const keys = [...body.toString('utf8').matchAll(/<Key>([^<]+)<\/Key>/g)].map((x) => x[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')); // &amp; last: no double unescaping
          for (const k of keys) { this.objects.delete(k); this.deleted.push(k); }
          res.writeHead(200, { 'content-type': 'application/xml' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?><DeleteResult>${keys.map((k) => `<Deleted><Key>${k}</Key></Deleted>`).join('')}</DeleteResult>`);
          return;
        }
        if (req.method === 'DELETE' && key) {
          this.objects.delete(key); this.deleted.push(key);
          res.writeHead(204); res.end();
          return;
        }
        if (req.method === 'GET' && !key) {
          const prefix = url.searchParams.get('prefix') || '';
          const keys = [...this.objects.keys()].filter((k) => k.startsWith(prefix));
          res.writeHead(200, { 'content-type': 'application/xml' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>${BUCKET}</Name><KeyCount>${keys.length}</KeyCount><IsTruncated>false</IsTruncated>${keys.map((k) => `<Contents><Key>${k}</Key><Size>${this.objects.get(k)!.body.length}</Size></Contents>`).join('')}</ListBucketResult>`);
          return;
        }
        if ((req.method === 'GET' || req.method === 'HEAD') && key) {
          const o = this.objects.get(key);
          if (!o) { res.writeHead(404, { 'content-type': 'application/xml' }); res.end(req.method === 'HEAD' ? undefined : '<Error><Code>NoSuchKey</Code></Error>'); return; }
          res.writeHead(200, { 'content-type': o.type, 'content-length': String(o.body.length) });
          res.end(req.method === 'HEAD' ? undefined : o.body);
          return;
        }
        res.writeHead(400); res.end();
      });
    });
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', () => r()));
  }
  has(key: string) { return this.objects.has(key); }
}

// ───────────────────────────── fake Cloudinary (upload API + admin delete) ─────────────────────────────
class FakeCloudinary {
  server!: http.Server;
  /** `${resource_type}/${type}/${public_id}` → content hash */
  assets = new Map<string, string>();
  destroyed: Array<{ public_id: string; type: string; result: string }> = [];
  private version = 1700000000;
  get prefix() { return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`; }

  async start() {
    this.server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const url = new URL(String(req.url), 'http://x');
        const f = parseForm(Buffer.concat(chunks), String(req.headers['content-type'] || ''));
        res.setHeader('content-type', 'application/json');
        const up = new RegExp(`^/v1_1/${CLOUD}/(image|raw|video|auto)/upload$`).exec(url.pathname);
        if (req.method === 'POST' && up) {
          const rt = up[1] === 'auto' ? 'image' : up[1];
          const type = f.type || 'upload';
          const publicId = f.public_id || `auto/${randomBytes(8).toString('hex')}`;
          const k = `${rt}/${type}/${publicId}`;
          const overwrite = f.overwrite === undefined || f.overwrite === '1' || f.overwrite === 'true';
          if (!this.assets.has(k) || overwrite) this.assets.set(k, sha(String(f.file || '')));
          const version = ++this.version;
          res.end(JSON.stringify({
            asset_id: randomBytes(16).toString('hex'), public_id: publicId, version, version_id: randomBytes(16).toString('hex'),
            signature: randomBytes(20).toString('hex'), width: 200, height: 200, format: 'webp', resource_type: rt, type,
            created_at: new Date().toISOString(), bytes: String(f.file || '').length, etag: randomBytes(16).toString('hex'),
            url: `http://res.cloudinary.com/${CLOUD}/${rt}/${type}/v${version}/${publicId}.webp`,
            secure_url: `https://res.cloudinary.com/${CLOUD}/${rt}/${type}/v${version}/${publicId}.webp`,
          }));
          return;
        }
        const del = new RegExp(`^/v1_1/${CLOUD}/(image|raw|video)/destroy$`).exec(url.pathname);
        if (req.method === 'POST' && del) {
          const type = f.type || 'upload';
          const k = `${del[1]}/${type}/${f.public_id}`;
          const result = this.assets.delete(k) ? 'ok' : 'not found';
          this.destroyed.push({ public_id: String(f.public_id), type, result });
          res.end(JSON.stringify({ result }));
          return;
        }
        const adm = new RegExp(`^/v1_1/${CLOUD}/resources/(image|raw|video)/(upload|authenticated|private)$`).exec(url.pathname);
        if (req.method === 'DELETE' && adm) {
          const ids = [...url.searchParams.getAll('public_ids[]'), ...url.searchParams.getAll('public_ids')];
          const bodyIds = (f as any)['public_ids[]'] || (f as any).public_ids;
          if (Array.isArray(bodyIds)) ids.push(...bodyIds); else if (bodyIds) ids.push(String(bodyIds));
          const deleted: Record<string, string> = {};
          for (const id of ids) {
            const r = this.assets.delete(`${adm[1]}/${adm[2]}/${id}`) ? 'deleted' : 'not_found';
            deleted[id] = r;
            this.destroyed.push({ public_id: id, type: adm[2], result: r });
          }
          res.end(JSON.stringify({ deleted, partial: false }));
          return;
        }
        res.statusCode = 404;
        res.end(JSON.stringify({ error: { message: `fake cloudinary: unknown ${req.method} ${url.pathname}` } }));
      });
    });
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', () => r()));
  }
  /** Live (key, content hash) pairs whose key starts with `prefix`. */
  live(prefix = '') { return [...this.assets.entries()].filter(([k]) => k.includes(prefix)).map(([k, h]) => `${k}#${h}`); }
}

// ───────────────────────────── the spec ─────────────────────────────
describe('D-32: replacing or deleting a file removes the old object from storage', () => {
  const stack = new LiveStack();
  const s3 = new FakeS3();
  const cl = new FakeCloudinary();
  let admin = '';
  let pat1 = '';
  let pat2 = '';
  let doctor = '';
  const DOCTOR = 'prov-doc-1';
  const MED = 'med-d32-1';

  const png = (r: number, g: number, b: number, size = 200): Promise<Buffer> =>
    sharp({ create: { width: size, height: size, channels: 3, background: { r, g, b } } }).png().toBuffer();

  /** Polls `check` until true (or the timeout), so asynchronous cleanup (events, queues) has time to run. */
  const eventually = async (check: () => Promise<boolean> | boolean, ms = 8000) => {
    const until = Date.now() + ms;
    for (;;) {
      if (await check()) return true;
      if (Date.now() > until) return false;
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  /** Multipart upload exactly like the patient app (FormData with `file` + fields). */
  const mediaUpload = async (token: string, fields: Record<string, string>, bytes: Buffer, name: string) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    fd.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), name);
    const res = await fetch(`${stack.servers[0].url}/api/v1/media/upload`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': `acc-${randomBytes(8).toString('hex')}` },
      body: fd,
    });
    const body: any = await res.json().catch(() => null);
    if (res.status >= 300 || !body?.id) throw new Error(`setup: POST /media/upload failed ${res.status} ${JSON.stringify(body)}`);
    const row = await stack.db.collection('media_assets').findOne({ id: body.id });
    if (!row?.key || !s3.has(row.key)) throw new Error(`setup: uploaded media ${body.id} is not in the fake R2 (row ${JSON.stringify(row)})`);
    return { id: String(body.id), key: String(row.key) };
  };

  /** Must succeed: a failing setup call is never reported as a storage failure. */
  const ok = async (method: string, p: string, token: string, body?: unknown) => {
    const r = await stack.call(0, method, p, token, body);
    if (r.status >= 300) throw new Error(`setup: ${method} ${p} → ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
    return r.body?.data ?? r.body;
  };

  /** POST /storage/upload (R2) → { id, key } with the object present in the fake. */
  const storageUpload = async (token: string, bytes: Buffer, name: string, extra: Record<string, unknown> = {}) => {
    const r = await ok('POST', '/api/v1/storage/upload', token, { data_base64: bytes.toString('base64'), mime: 'image/png', original_name: name, ...extra });
    const row = await stack.db.collection('storage_objects').findOne({ id: r.id });
    if (!row?.external_key || !s3.has(row.external_key)) throw new Error(`setup: storage object ${r.id} is not in the fake R2 (row ${JSON.stringify(row)})`);
    return { id: String(r.id), key: String(row.external_key) };
  };

  const rowGoneOrDeleted = async (collection: string, filter: Record<string, unknown>) => {
    const row = await stack.db.collection(collection).findOne(filter);
    return !row || row.deleted === true || row.is_deleted === true || !!row.deleted_at;
  };

  beforeAll(async () => {
    await s3.start();
    await cl.start();
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('provider_accounts').insertOne({ id: DOCTOR, provider_type: 'doctor', status: 'approved', email: 'doc-d32@acceptance.test', createdAt: new Date(), updatedAt: new Date() });
      await db.collection('provider_profiles').insertOne({ id: 'pp-d32-1', account_id: DOCTOR, provider_type: 'doctor', display_name_ar: 'د. اختبار', display_name_en: 'Dr Test', phones: [], enabled_modules: [], createdAt: new Date(), updatedAt: new Date() });
      await db.collection('medicines').insertOne({ id: MED, name_ar: 'بنادول', name_en: 'Panadol', price: 10, is_deleted: false, createdAt: new Date(), updatedAt: new Date() });
      await db.collection('chat_threads').insertOne({ id: 'th-d32-1', type: 'direct', participant_ids: ['pat-1', 'pat-2'], created_by: 'pat-1', unread_counts: { 'pat-1': 0, 'pat-2': 0 }, createdAt: new Date(), updatedAt: new Date() });
    }, {
      S3_ENDPOINT: s3.endpoint, S3_BUCKET: BUCKET, S3_ACCESS_KEY_ID: S3_KEY_ID, S3_SECRET_ACCESS_KEY: S3_SECRET, S3_REGION: 'auto',
      S3_PUBLIC_BASE_URL: PUBLIC_BASE,
      CLOUDINARY_CLOUD_NAME: CLOUD, CLOUDINARY_API_KEY: CL_KEY, CLOUDINARY_API_SECRET: CL_SECRET,
      CLOUDINARY_URL: `cloudinary://${CL_KEY}:${CL_SECRET}@${CLOUD}?upload_prefix=${cl.prefix}`,
    });
    admin = await stack.admin('adm-1');
    pat1 = await stack.patient('pat-1');
    pat2 = await stack.patient('pat-2');
    doctor = new JwtService({ secret: JWT_SECRET }).sign({ id: DOCTOR, sub: DOCTOR, role: 'provider', provider_type: 'doctor', scope: 'provider' });
  });
  afterAll(async () => { await stack.stop(); s3.server?.close(); cl.server?.close(); });

  // ── 1. media files ────────────────────────────────────────────────────────────────────────────
  describe('1. media files (POST /media/upload → R2 + media_assets)', () => {
    it('a. an admin deleting a file (DELETE /media/<key>) removes the R2 object and its media_assets row', async () => {
      const f = await mediaUpload(pat1, { purpose: 'report' }, await png(10, 20, 30), 'report.png');
      await ok('DELETE', `/api/v1/media/${f.key}`, admin);
      expect({ r2_object_still_exists: !(await eventually(() => !s3.has(f.key))) }).toEqual({ r2_object_still_exists: false });
      expect({ media_assets_row_remains: !(await eventually(() => rowGoneOrDeleted('media_assets', { id: f.id }))) }).toEqual({ media_assets_row_remains: false });
    });

    it('b. the owner deletes their own file by id (DELETE /media/<id>): object and row removed; another patient cannot', async () => {
      const f = await mediaUpload(pat1, { purpose: 'order_prescription' }, await png(40, 50, 60), 'rx.png');
      const other = await stack.call(0, 'DELETE', `/api/v1/media/${f.id}`, pat2);
      expect(other.status).toBeGreaterThanOrEqual(400);
      expect({ another_patient_deleted_it: !s3.has(f.key) }).toEqual({ another_patient_deleted_it: false });
      const own = await stack.call(0, 'DELETE', `/api/v1/media/${f.id}`, pat1);
      expect({ owner_delete_status: own.status < 300 ? 'ok' : `${own.status} ${JSON.stringify(own.body).slice(0, 160)}` }).toEqual({ owner_delete_status: 'ok' });
      expect({ r2_object_still_exists: !(await eventually(() => !s3.has(f.key))) }).toEqual({ r2_object_still_exists: false });
      expect({ media_assets_row_remains: !(await eventually(() => rowGoneOrDeleted('media_assets', { id: f.id }))) }).toEqual({ media_assets_row_remains: false });
    });
  });

  // ── 2. patient avatar ─────────────────────────────────────────────────────────────────────────
  it('2. replacing the patient avatar (POST /media/upload + PATCH /users/me/profile) removes the old avatar', async () => {
    const a = await mediaUpload(pat1, { purpose: 'avatar' }, await png(200, 0, 0), 'avatar-1.png');
    await ok('PATCH', '/api/v1/users/me/profile', pat1, { avatar_url: `media:${a.id}` });
    const b = await mediaUpload(pat1, { purpose: 'avatar' }, await png(0, 200, 0), 'avatar-2.png');
    await ok('PATCH', '/api/v1/users/me/profile', pat1, { avatar_url: `media:${b.id}` });
    expect({ old_avatar_r2_object_still_exists: !(await eventually(() => !s3.has(a.key))) }).toEqual({ old_avatar_r2_object_still_exists: false });
    expect({ old_avatar_media_assets_row_remains: !(await eventually(() => rowGoneOrDeleted('media_assets', { id: a.id }))) }).toEqual({ old_avatar_media_assets_row_remains: false });
    expect({ new_avatar_exists: s3.has(b.key) && !(await rowGoneOrDeleted('media_assets', { id: b.id })) }).toEqual({ new_avatar_exists: true });
  });

  // ── 3. doctor profile photo (Cloudinary) ──────────────────────────────────────────────────────
  describe('3. doctor profile photo (processed to Cloudinary)', () => {
    /** Waits for the background processor to finish every job of the doctor; returns the 4 storage ids. */
    const processed = async () => {
      const done = await eventually(async () => {
        const jobs = await stack.db.collection('image_processing_jobs').find({ owner_id: DOCTOR }).sort({ createdAt: -1 }).toArray();
        return jobs.length > 0 && !jobs.some((j: any) => j.status === 'pending' || j.status === 'processing');
      }, 90_000);
      const latest: any = await stack.db.collection('image_processing_jobs').find({ owner_id: DOCTOR }).sort({ createdAt: -1 }).limit(1).next();
      if (!done || latest?.status !== 'completed') throw new Error(`setup: profile image job did not complete: ${latest?.status} ${latest?.error || ''}`);
      const meta: any = await stack.db.collection('profile_images_metadata').findOne({ owner_id: DOCTOR });
      const ids = [meta?.originalImageUrl, meta?.processedImageUrl, meta?.mediumImageUrl, meta?.thumbnailImageUrl].map(String);
      const rows: any[] = await stack.db.collection('storage_objects').find({ id: { $in: ids } }).toArray();
      if (rows.length !== 4) throw new Error(`setup: expected 4 processed storage rows, got ${rows.length}`);
      const live = rows.map((r) => `image/authenticated/${r.external_key}#${cl.assets.get(`image/authenticated/${r.external_key}`)}`);
      if (live.some((l) => l.endsWith('#undefined'))) throw new Error(`setup: processed images are not in the fake Cloudinary: ${JSON.stringify(cl.live())}`);
      return { ids, live };
    };
    const rawKept = async () => (await stack.db.collection('image_processing_jobs')
      .find({ owner_id: DOCTOR, status: { $in: ['completed', 'failed'] } }).toArray())
      .filter((j: any) => typeof j.data_base64 === 'string' && j.data_base64.length > 0).length;

    /** The old photo's assets, rows and raw upload are gone once `next` is processed; the new one is live. */
    const expectReplaced = async (prev: { ids: string[]; live: string[] }, next: { ids: string[]; live: string[] }) => {
      const liveNow = new Set(cl.live());
      expect({ old_cloudinary_assets_still_live: prev.live.filter((l) => liveNow.has(l)) }).toEqual({ old_cloudinary_assets_still_live: [] });
      const oldRows: string[] = [];
      for (const id of prev.ids.filter((i) => !next.ids.includes(i))) if (!(await rowGoneOrDeleted('storage_objects', { id }))) oldRows.push(id);
      expect({ old_storage_objects_rows_remaining: oldRows.length }).toEqual({ old_storage_objects_rows_remaining: 0 });
      expect({ image_processing_jobs_keeping_raw_base64: await rawKept() }).toEqual({ image_processing_jobs_keeping_raw_base64: 0 });
      expect({ new_assets_live: next.live.every((l) => liveNow.has(l)) }).toEqual({ new_assets_live: true });
    };
    const adminReplace = async (rgb: [number, number, number]) => {
      const r = await stack.call(0, 'POST', `/api/v1/admin/providers/${DOCTOR}/replace-image`, admin, { data_base64: (await png(...rgb, 300)).toString('base64'), mime: 'image/png' });
      // A doctor with no photo yet must be able to get one (today the first upload answers 500).
      expect({ admin_replace_image_route: r.status < 300 ? 'ok' : `${r.status} ${JSON.stringify(r.body).slice(0, 160)} — the photo cannot be set or replaced` })
        .toEqual({ admin_replace_image_route: 'ok' });
      return processed();
    };

    it('the admin replaces it (POST /admin/providers/:id/replace-image twice): old assets and rows gone, raw base64 cleared', async () => {
      const first = await adminReplace([0, 160, 80]);
      const second = await adminReplace([160, 0, 80]);
      await expectReplaced(first, second);
    });

    it('the doctor replaces the photo (POST /provider/profile/image/upload): old assets and rows gone, raw base64 cleared', async () => {
      const prev = await adminReplace([255, 0, 0]);
      const r = await stack.call(0, 'POST', '/api/v1/provider/profile/image/upload', doctor, { data_base64: (await png(0, 0, 255, 300)).toString('base64'), mime: 'image/png', original_name: 'doc-2.png' });
      expect({ doctor_upload_route: r.status < 300 ? 'ok' : `${r.status} ${JSON.stringify(r.body).slice(0, 160)} — the doctor cannot replace the photo through the app's route` })
        .toEqual({ doctor_upload_route: 'ok' });
      await expectReplaced(prev, await processed());
    });
  });

  // ── 4. KYC document ───────────────────────────────────────────────────────────────────────────
  it('4. replacing a KYC document (POST /provider/kyc/documents, same doc_type twice) deletes the old R2 object', async () => {
    const pdf = (s: string) => Buffer.from(`%PDF-1.4\n% ${s}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`).toString('base64');
    const d1 = await ok('POST', '/api/v1/provider/kyc/documents', doctor, { doc_type: 'medical_license', doc_number: 'ML-1', file: { data_base64: pdf('one'), mime: 'application/pdf', original_name: 'licence-1.pdf' } });
    const o1: any = await stack.db.collection('storage_objects').findOne({ id: d1.storage_object_id });
    if (!o1?.external_key || !s3.has(o1.external_key)) throw new Error(`setup: first KYC document not in the fake R2 (${JSON.stringify(o1)})`);
    const d2 = await ok('POST', '/api/v1/provider/kyc/documents', doctor, { doc_type: 'medical_license', doc_number: 'ML-2', file: { data_base64: pdf('two'), mime: 'application/pdf', original_name: 'licence-2.pdf' } });
    const o2: any = await stack.db.collection('storage_objects').findOne({ id: d2.storage_object_id });
    expect({ old_kyc_r2_object_still_exists: !(await eventually(() => !s3.has(o1.external_key))) }).toEqual({ old_kyc_r2_object_still_exists: false });
    expect({ old_kyc_storage_row_remains: !(await eventually(() => rowGoneOrDeleted('storage_objects', { id: o1.id }))) }).toEqual({ old_kyc_storage_row_remains: false });
    expect({ new_kyc_object_exists: !!o2?.external_key && s3.has(o2.external_key) }).toEqual({ new_kyc_object_exists: true });
  });

  // ── 5. clinic gallery + logo ──────────────────────────────────────────────────────────────────
  describe('5. provider clinic gallery and logo (settings delta approved by the admin)', () => {
    const applyDelta = async (changes: Record<string, unknown>) => {
      const d = await ok('POST', '/api/v1/provider/settings/delta', doctor, { changes });
      const id = d?.id || d?.data?.id;
      if (!id) throw new Error(`setup: delta id missing ${JSON.stringify(d)}`);
      await ok('POST', `/api/v1/admin/providers/provider-deltas/${id}/approve`, admin, {});
    };

    it('removing a gallery image deletes its R2 object; the image still shown stays', async () => {
      const a = await storageUpload(doctor, await png(1, 2, 3), 'clinic-a.jpg', { visibility: 'private', target: 'cloudinary' });
      const b = await storageUpload(doctor, await png(4, 5, 6), 'clinic-b.jpg', { visibility: 'private', target: 'cloudinary' });
      await applyDelta({ clinic_images: [a.id, b.id] });
      await applyDelta({ clinic_images: [b.id] });
      expect({ removed_image_r2_object_still_exists: !(await eventually(() => !s3.has(a.key))) }).toEqual({ removed_image_r2_object_still_exists: false });
      expect({ removed_image_storage_row_remains: !(await eventually(() => rowGoneOrDeleted('storage_objects', { id: a.id }))) }).toEqual({ removed_image_storage_row_remains: false });
      expect({ kept_image_exists: s3.has(b.key) }).toEqual({ kept_image_exists: true });
    });

    it('replacing the logo deletes the old logo object', async () => {
      const l1 = await storageUpload(doctor, await png(7, 8, 9), 'logo-1.png');
      await applyDelta({ logo: l1.id });
      const l2 = await storageUpload(doctor, await png(9, 8, 7), 'logo-2.png');
      await applyDelta({ logo: l2.id });
      expect({ old_logo_r2_object_still_exists: !(await eventually(() => !s3.has(l1.key))) }).toEqual({ old_logo_r2_object_still_exists: false });
      expect({ old_logo_storage_row_remains: !(await eventually(() => rowGoneOrDeleted('storage_objects', { id: l1.id }))) }).toEqual({ old_logo_storage_row_remains: false });
      expect({ new_logo_exists: s3.has(l2.key) }).toEqual({ new_logo_exists: true });
    });
  });

  // ── 6. medicine image ─────────────────────────────────────────────────────────────────────────
  describe('6. medicine image (admin catalogue edit)', () => {
    /** Exactly the admin page: /storage/upload, then the URL from /storage/:id/signed-url is saved on the medicine. */
    const adminImage = async (rgb: [number, number, number], name: string) => {
      const o = await storageUpload(admin, await png(...rgb), name, { visibility: 'public_read' });
      const signed = await ok('GET', `/api/v1/storage/${o.id}/signed-url`, admin);
      if (!signed?.url) throw new Error(`setup: no signed url ${JSON.stringify(signed)}`);
      return { ...o, url: String(signed.url) };
    };

    it('replacing the main image (PATCH /medicines/admin/catalog/:id) deletes the old R2 object', async () => {
      const i1 = await adminImage([100, 0, 0], 'med-1.png');
      await ok('PATCH', `/api/v1/medicines/admin/catalog/${MED}`, admin, { image: i1.url, images: [i1.url] });
      const i2 = await adminImage([0, 100, 0], 'med-2.png');
      await ok('PATCH', `/api/v1/medicines/admin/catalog/${MED}`, admin, { image: i2.url, images: [i2.url] });
      expect({ old_medicine_image_r2_object_still_exists: !(await eventually(() => !s3.has(i1.key))) }).toEqual({ old_medicine_image_r2_object_still_exists: false });
      expect({ old_medicine_image_storage_row_remains: !(await eventually(() => rowGoneOrDeleted('storage_objects', { id: i1.id }))) }).toEqual({ old_medicine_image_storage_row_remains: false });
      expect({ new_medicine_image_exists: s3.has(i2.key) }).toEqual({ new_medicine_image_exists: true });
    });

    it('removing a gallery image deletes its R2 object', async () => {
      const main: any = await stack.db.collection('medicines').findOne({ id: MED });
      const g = await adminImage([0, 0, 100], 'med-gallery.png');
      await ok('PATCH', `/api/v1/medicines/admin/catalog/${MED}`, admin, { images: [main.image, g.url] });
      await ok('PATCH', `/api/v1/medicines/admin/catalog/${MED}`, admin, { images: [main.image] });
      expect({ removed_gallery_r2_object_still_exists: !(await eventually(() => !s3.has(g.key))) }).toEqual({ removed_gallery_r2_object_still_exists: false });
    });
  });

  // ── 7. chat attachment ────────────────────────────────────────────────────────────────────────
  it('7. deleting a chat message (DELETE /chat/messages/:id) removes its attachment object and media row', async () => {
    const f = await mediaUpload(pat1, { purpose: 'chat', thread_id: 'th-d32-1' }, await png(33, 66, 99), 'photo.png');
    await ok('POST', '/api/v1/chat/threads/th-d32-1/messages', pat1, { body: 'see attached', media_ids: [f.id] });
    const msg: any = await stack.db.collection('chat_messages').findOne({ thread_id: 'th-d32-1', media_ids: f.id });
    if (!msg?.id) throw new Error('setup: chat message with the attachment not found');
    await ok('DELETE', `/api/v1/chat/messages/${msg.id}`, pat1);
    expect({ attachment_r2_object_still_exists: !(await eventually(() => !s3.has(f.key))) }).toEqual({ attachment_r2_object_still_exists: false });
    expect({ attachment_media_assets_row_remains: !(await eventually(() => rowGoneOrDeleted('media_assets', { id: f.id }))) }).toEqual({ attachment_media_assets_row_remains: false });
  });

  // ── gaps: kinds with no delete route today ────────────────────────────────────────────────────
  it('G1. GAP — the patient deletes an uploaded prescription (DELETE /prescriptions/:id) and its photo is removed', async () => {
    const photo = `data:image/png;base64,${(await png(5, 50, 150)).toString('base64')}`;
    const rx = await ok('POST', '/api/v1/prescriptions/upload', pat1, { upload_image: photo, notes: 'd32' });
    const id = rx?.id;
    if (!id) throw new Error(`setup: prescription id missing ${JSON.stringify(rx).slice(0, 200)}`);
    const r = await stack.call(0, 'DELETE', `/api/v1/prescriptions/${id}`, pat1);
    expect({ delete_prescription_route: r.status < 300 ? 'ok' : `GAP: DELETE /prescriptions/:id answered ${r.status} — no route lets the patient delete an uploaded prescription photo` })
      .toEqual({ delete_prescription_route: 'ok' });
    const row: any = await stack.db.collection('prescriptions').findOne({ id });
    expect({ prescription_photo_still_stored: !!row?.upload_image }).toEqual({ prescription_photo_still_stored: false });
  });

  it('G2. GAP — the patient withdraws a return (DELETE /pharmacy/returns/:id) and its evidence photos are removed', async () => {
    const f = await mediaUpload(pat1, { purpose: 'report' }, await png(120, 60, 30), 'evidence.png');
    const id = `ret-d32-${randomBytes(4).toString('hex')}`;
    await stack.db.collection('returnrequests').insertOne({
      id, patient_id: 'pat-1', order_id: 'ord-d32-1', service_type: 'pharmacy', reason: 'damaged item', status: 'processing',
      amount: 0, refund_method: 'original', attached_docs: [`media:${f.id}`], createdAt: new Date(), updatedAt: new Date(),
    });
    const r = await stack.call(0, 'DELETE', `/api/v1/pharmacy/returns/${id}`, pat1);
    expect({ withdraw_return_route: r.status < 300 ? 'ok' : `GAP: DELETE /pharmacy/returns/:id answered ${r.status} — no route deletes return/complaint evidence` })
      .toEqual({ withdraw_return_route: 'ok' });
    expect({ evidence_r2_object_still_exists: !(await eventually(() => !s3.has(f.key))) }).toEqual({ evidence_r2_object_still_exists: false });
    expect({ evidence_media_assets_row_remains: !(await eventually(() => rowGoneOrDeleted('media_assets', { id: f.id }))) }).toEqual({ evidence_media_assets_row_remains: false });
  });
});
