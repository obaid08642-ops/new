/**
 * #1556 owner decision F: insurers only from official sources with a source URL per row, and no invented class.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongo as mdb } from 'mongoose';

jest.setTimeout(240_000);
const BACKEND = path.resolve(__dirname, '../../..');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const data = require(path.join(BACKEND, 'src/modules/catalogs/content/insurance-official.v1.json'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const seed: Array<{ code: string }> = require(path.join(BACKEND, 'src/modules/catalogs/seed-data/insurance.json'));

describe('insurance-official.v1.json', () => {
  it('every company row names its official source and licence', () => {
    for (const c of data.companies) {
      expect(c.source_url).toMatch(/^https:\/\/www\.ia\.gov\.sa\//);
      expect(c.licence_no).toMatch(/^TMN\/\d{5,6}\/\d+$/);
      expect(c.unified_no).toMatch(/^7\d{9}$/);
      expect(c.name_ar).toMatch(/[؀-ۿ]/);
    }
  });
  it('no class is written without an official source; every health insurer without classes is listed for the owner', () => {
    for (const c of data.companies) for (const k of c.classes) expect(k.source_url).toMatch(/^https:\/\//);
    const health = data.companies.filter((c: { health_insurance_licensed: boolean; classes: unknown[] }) => c.health_insurance_licensed && !c.classes.length).map((c: { name_en: string }) => c.name_en);
    expect(data.for_owner.no_published_classes).toEqual(health);
  });
  it('seed codes exist and catalogue companies missing from the list are reported', () => {
    const codes = seed.map((s) => s.code);
    for (const c of data.companies) if (c.seed_code) expect(codes).toContain(c.seed_code);
    const listed = new Set(data.companies.map((c: { seed_code: string | null }) => c.seed_code));
    expect(data.seed_companies_not_on_list.map((x: { seed_code: string }) => x.seed_code)).toEqual(codes.filter((c) => !listed.has(c)));
  });
});

describe('2026-10-insurance-official.ts', () => {
  let server: MongoMemoryServer;
  let client: mdb.MongoClient;
  let uri: string;
  const run = (args: string[] = [], env: Record<string, string> = {}) => {
    const r = spawnSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), '--transpile-only', path.join(BACKEND, 'scripts/migrations/2026-10-insurance-official.ts'), ...args], {
      cwd: BACKEND, env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri, ...env }, encoding: 'utf8',
    });
    const line = `${r.stdout}`.split('\n').find((l) => l.startsWith('{"mode"'));
    return { status: r.status, out: `${r.stdout}${r.stderr}`, report: line ? JSON.parse(line) : null };
  };
  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    uri = `${server.getUri()}nabd_ins`;
    client = await mdb.MongoClient.connect(uri);
    await client.db().collection('insurance_companies').insertMany([{ code: 'bupa', name_en: 'Bupa Arabia' }, { code: 'globemed', name_en: 'GlobeMed' }]);
  });
  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });
  it('refuses production without the confirm variable', () => {
    expect(run([], { NODE_ENV: 'production' }).out).toContain('CONFIRM_INSURANCE_OFFICIAL');
  });
  it('records licence and source on listed companies, reports the rest, writes no class', async () => {
    expect(run().status).toBe(0);
    expect((await client.db().collection('insurance_companies').findOne({ code: 'bupa' }))?.licence_no).toBeUndefined();
    const r = run(['--apply']);
    expect(r.report.catalogue_not_on_official_list).toEqual(['globemed']);
    const bupa = await client.db().collection('insurance_companies').findOne({ code: 'bupa' });
    expect(bupa).toEqual(expect.objectContaining({ licence_no: 'TMN/20088/18', health_insurance_licensed: true, regulatory_source_url: expect.stringContaining('ia.gov.sa') }));
    expect(await client.db().collection('insurance_networks').countDocuments()).toBe(0);
  });
});
