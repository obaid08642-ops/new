/**
 * #1556 owner decision F: published six-language content for every lab test, scan and nursing service (names stay Arabic and English; the
 * specialties keep six-language names), and the missing common items. Checks the content file itself (every language present and in
 * its own script, every seed row covered) and runs the real apply script on an in-memory MongoDB seeded from
 * seed-data.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongo as mdb } from 'mongoose';

jest.setTimeout(240_000);

const BACKEND = path.resolve(__dirname, '../../..');
const SEED = path.join(BACKEND, 'src/modules/catalogs/seed-data');
const SCRIPT = path.join(BACKEND, 'scripts/migrations/2026-10-services-content.ts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const content = require(path.join(BACKEND, 'src/modules/catalogs/content/services-content.v1.json'));
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
const SCRIPT_RE: Record<string, RegExp> = {
  ar: /[؀-ۿ]/, ur: /[؀-ۿ]/, hi: /[ऀ-ॿ]/, bn: /[ঀ-৿]/, en: /[A-Za-z]/, fil: /[A-Za-z]/,
};
const KINDS = ['lab_services', 'radiology_services', 'nursing_services'] as const;
const SEEDS: Record<string, string> = { lab_services: 'labs.json', radiology_services: 'radiology.json', nursing_services: 'nursing.json' };
type Item = { match: { codes: string[]; names_en: string[] }; add?: Record<string, unknown> } & Record<string, Record<string, unknown>>;
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const covers = (row: Record<string, unknown>, it: Item) =>
  ['short_code', 'test_code', 'code', 'id'].some((k) => it.match.codes.includes(row[k] as string)) || it.match.names_en.map(norm).includes(norm(row.name_en));

describe('services-content.v1.json', () => {
  it('is published, versioned and names its languages', () => {
    expect(content).toEqual(expect.objectContaining({ version: 1, status: 'published', medical_review_status: 'approved', post_launch_review: 'pending', languages: [...LANGS] }));
  });
  it.each(KINDS)('%s: every item has all four texts in all six languages, each in its own script', (kind) => {
    const bad: string[] = [];
    for (const it of content[kind] as Item[]) {
      for (const field of ['description', 'purpose', 'turnaround']) {
        for (const l of LANGS) if (!SCRIPT_RE[l].test(String(it[field][l] ?? ''))) bad.push(`${it.match.names_en[0]}.${field}.${l}`);
      }
      for (const l of LANGS) {
        const prep = it.preparation[l] as unknown as string[];
        if (!Array.isArray(prep) || !prep.length || !prep.every((p) => SCRIPT_RE[l].test(p))) bad.push(`${it.match.names_en[0]}.preparation.${l}`);
      }
      // owner decision 2026-10-25: the name of a test, scan or nursing service stays Arabic and English only
      if ('names' in it) bad.push(`${it.match.names_en[0]}.names (must not be written)`);
    }
    expect(bad).toEqual([]);
  });
  it.each(KINDS)('%s: every seed row has content', (kind) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rows: Array<Record<string, unknown>> = require(path.join(SEED, SEEDS[kind]));
    expect(rows.filter((r) => !(content[kind] as Item[]).some((it) => covers(r, it))).map((r) => r.name_en)).toEqual([]);
  });
  it('every specialty has six names', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rows: Array<{ code: string }> = require(path.join(SEED, 'specialties.json'));
    const codes = content.specialties.map((s: { code: string }) => s.code);
    expect(rows.filter((r) => !codes.includes(r.code))).toEqual([]);
    for (const s of content.specialties) for (const l of LANGS) expect(SCRIPT_RE[l].test(s.names[l])).toBe(true);
  });
  it('added items carry no invented price', () => {
    for (const kind of KINDS) for (const it of (content[kind] as Item[]).filter((x) => x.add)) expect(it.add).not.toHaveProperty('price');
  });
});

describe('2026-10-services-content.ts', () => {
  let server: MongoMemoryServer;
  let client: mdb.MongoClient;
  let db: mdb.Db;
  let uri: string;
  const run = (args: string[] = [], env: Record<string, string> = {}) => {
    const r = spawnSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), '--transpile-only', SCRIPT, ...args], {
      cwd: BACKEND, env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri, ...env }, encoding: 'utf8',
    });
    const out = `${r.stdout}${r.stderr}`;
    const line = out.split('\n').find((l) => l.startsWith('{"mode"'));
    return { status: r.status, out, report: line ? JSON.parse(line) : null };
  };

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    uri = `${server.getUri()}nabd_content`;
    client = await mdb.MongoClient.connect(uri);
    db = client.db();
    for (const kind of KINDS) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      await db.collection(kind).insertMany((require(path.join(SEED, SEEDS[kind])) as Array<Record<string, unknown>>).map((x) => ({ ...x, public_eligibility: true })));
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await db.collection('specialties').insertMany(require(path.join(SEED, 'specialties.json')));
    // an admin-hidden row keeps its visibility
    await db.collection('lab_services').updateOne({ short_code: 'CBC' }, { $set: { public_eligibility: false } });
  });
  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });

  it('refuses production without the confirm variable', () => {
    const r = run([], { NODE_ENV: 'production' });
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('CONFIRM_SERVICES_CONTENT');
  });

  it('dry run reports and writes nothing', async () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.report.report.lab_services.without_content).toEqual([]);
    expect(await db.collection('lab_services').countDocuments({ content: { $exists: true } })).toBe(0);
  });

  it('apply publishes the content on every row, in six languages', async () => {
    const r = run(['--apply']);
    expect(r.status).toBe(0);
    for (const kind of KINDS) {
      expect(await db.collection(kind).countDocuments({ 'content.status': { $ne: 'published' } })).toBe(0);
      expect(await db.collection(kind).countDocuments({ description_ur: { $exists: false } })).toBe(0);
    }
    const fbs = await db.collection('lab_services').findOne({ short_code: 'FBS' });
    expect(fbs).toEqual(expect.objectContaining({ fasting_required: true, fasting_hours: 8 }));
    expect(fbs?.content.translations.tl.purpose).toMatch(/diabetes/);
    expect(fbs?.preparation_bn[0]).toMatch(/[ঀ-৿]/);
    expect((await db.collection('lab_services').findOne({ short_code: 'CBC' }))?.public_eligibility).toBe(false);
  });

  it('adds the missing items without a price and hidden until priced', async () => {
    const uric = await db.collection('lab_services').findOne({ short_code: 'URIC' });
    expect(uric).toEqual(expect.objectContaining({ name_en: 'Uric Acid', needs_price: true, public_eligibility: false }));
    expect(uric).not.toHaveProperty('price');
    expect(await db.collection('radiology_services').countDocuments({ short_code: 'CT_KUB' })).toBe(1);
    expect(await db.collection('nursing_services').countDocuments({ code: 'home_ecg' })).toBe(1);
    expect(await db.collection('specialties').findOne({ code: 'hematology' })).toEqual(expect.objectContaining({ active: true, name_hi: expect.stringMatching(/[ऀ-ॿ]/) }));
    expect((await db.collection('specialties').findOne({ code: 'cardiology' }))?.name_en).toBe('Cardiology');
  });

  it('a second run changes nothing', async () => {
    const r = run(['--apply']);
    expect(KINDS.every((k) => r.report.report[k].written === 0 && r.report.report[k].added.length === 0)).toBe(true);
  });
});
