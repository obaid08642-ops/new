import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DRAFT_KEY, POLICY_KEY, compareVersions, loadAgreementTexts, publishAgreement } from './publish-provider-agreement';

const DOCS = path.resolve(__dirname, '../../../docs/legal');
const NOW = new Date('2026-11-02T08:00:00Z');

function tmpDocs(ar: string, en: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legal-'));
  fs.writeFileSync(path.join(dir, '03_PROVIDER_AGREEMENT.ar.md'), ar);
  fs.writeFileSync(path.join(dir, '03_PROVIDER_AGREEMENT.en.md'), en);
  return dir;
}

describe('provider agreement texts', () => {
  it('the repository texts load: same version, no draft wording, no blank brackets', () => {
    const t = loadAgreementTexts(DOCS);
    expect(t.version).toBe('1.0');
    expect(t.ar).toContain('منصة نبض الطبية');
    expect(t.en).toContain('Nabd Medical Platform');
  });

  it('is refused when a blank is left, when it says draft, or when the versions differ', () => {
    expect(() => loadAgreementTexts(tmpDocs('**الإصدار:** 1.0\nالسجل [ ]', '**Version:** 1.0\ntext'))).toThrow(/blank/);
    expect(() => loadAgreementTexts(tmpDocs('**الإصدار:** 1.0\nمسودة', '**Version:** 1.0\ntext'))).toThrow(/draft/);
    expect(() => loadAgreementTexts(tmpDocs('**الإصدار:** 1.0\nنص', '**Version:** 1.0\nThis is a draft'))).toThrow(/draft/);
    expect(() => loadAgreementTexts(tmpDocs('**الإصدار:** 1.0\nنص', '**Version:** 1.1\ntext'))).toThrow(/same version/);
  });

  it('compares versions numerically', () => {
    expect(compareVersions('1.0', '1.0')).toBe(0);
    expect(compareVersions('1.9', '1.10')).toBe(-1);
    expect(compareVersions('2.0', '1.9')).toBe(1);
  });
});

describe('publishing the provider agreement', () => {
  let srv: MongoMemoryServer;
  let conn: mongoose.Connection;
  const texts = { ar: 'نص الاتفاقية', en: 'agreement text', version: '1.0' };
  const col = (n: string) => conn.collection(n);
  beforeAll(async () => {
    srv = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(srv.getUri(), { dbName: 'pub' }).asPromise();
  }, 120_000);
  afterAll(async () => { await conn?.close(); await srv?.stop(); });
  beforeEach(async () => { for (const n of ['legal_policies', 'legal_policy_backups', 'legal_policy_snapshots']) await col(n).deleteMany({}); });
  const run = (t = texts, apply = true, requireAcceptance = true) => publishAgreement(conn.db as any, t, { apply, requireAcceptance, now: NOW });

  it('a dry run writes nothing', async () => {
    await col('legal_policies').insertOne({ key: DRAFT_KEY, version: '1.1', status: 'DRAFT' });
    const r = await run(texts, false);
    expect(r.result).toBe('dry-run-would-publish');
    expect(await col('legal_policies').countDocuments({ key: POLICY_KEY })).toBe(0);
    expect(await col('legal_policies').countDocuments({ key: DRAFT_KEY })).toBe(1);
    expect(await col('legal_policy_backups').countDocuments()).toBe(0);
  });

  it('publishes the first version: PUBLISHED, effective now, acceptance required, snapshot written, draft retired and backed up', async () => {
    await col('legal_policies').insertOne({ key: DRAFT_KEY, version: '1.1', status: 'DRAFT', content_ar: 'old draft' });
    const r = await run();
    expect(r).toMatchObject({ result: 'published', previousVersion: null, draftRetired: true });
    const p: any = await col('legal_policies').findOne({ key: POLICY_KEY });
    expect(p).toMatchObject({ status: 'PUBLISHED', version: '1.0', requires_acceptance: true, applies_to: ['provider'], content_ar: texts.ar, content_en: texts.en });
    expect(p.effective_date).toEqual(NOW);
    expect(p.change_log).toHaveLength(1);
    const snap: any = await col('legal_policy_snapshots').findOne({ key: POLICY_KEY, version: '1.0' });
    expect(snap).toMatchObject({ content_ar: texts.ar, content_en: texts.en });
    expect(snap.content_sha256_ar).toHaveLength(64);
    expect(await col('legal_policies').countDocuments({ key: DRAFT_KEY })).toBe(0);
    const b: any = await col('legal_policy_backups').findOne({ backup_of: DRAFT_KEY });
    expect(b).toMatchObject({ content_ar: 'old draft' });
  });

  it('REQUIRE_ACCEPTANCE=no does not lock anyone out', async () => {
    await run(texts, true, false);
    expect(await col('legal_policies').findOne({ key: POLICY_KEY })).toMatchObject({ requires_acceptance: false });
  });

  it('publishing over an existing row backs it up first and keeps its change log', async () => {
    await col('legal_policies').insertOne({ key: POLICY_KEY, version: '0.9', content_ar: 'older', change_log: [{ version: '0.9' }] });
    const r = await run();
    expect(r.previousVersion).toBe('0.9');
    const b: any = await col('legal_policy_backups').findOne({ backup_of: POLICY_KEY });
    expect(b).toMatchObject({ version: '0.9', content_ar: 'older' });
    const p: any = await col('legal_policies').findOne({ key: POLICY_KEY });
    expect(p.change_log).toHaveLength(2);
    expect(p.version).toBe('1.0');
  });

  it('is idempotent for the same text and refuses to rewrite or lower a published version', async () => {
    await run();
    expect((await run()).result).toBe('unchanged');
    await expect(run({ ...texts, en: 'edited text' })).rejects.toThrow(/already published/);
    await col('legal_policies').updateOne({ key: POLICY_KEY }, { $set: { version: '2.0' } });
    await expect(run()).rejects.toThrow(/already published/);
    expect(await col('legal_policy_backups').countDocuments()).toBe(0);
  });

  it('a higher version replaces the published one without touching the older snapshot', async () => {
    await run();
    const r = await run({ ...texts, ar: 'نص جديد', version: '2.0' });
    expect(r).toMatchObject({ result: 'published', previousVersion: '1.0' });
    expect(await col('legal_policy_snapshots').countDocuments({ key: POLICY_KEY })).toBe(2);
    expect(await col('legal_policy_snapshots').findOne({ key: POLICY_KEY, version: '1.0' })).toMatchObject({ content_ar: texts.ar });
  });
});
