import * as path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DRAFT_KEY, loadDraftTexts, seedDraft } from './seed-provider-agreement-draft';

const DOCS = path.resolve(__dirname, '../../../docs/legal');

describe('provider agreement draft seed', () => {
  let srv: MongoMemoryServer;
  let conn: mongoose.Connection;
  beforeAll(async () => {
    srv = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(srv.getUri(), { dbName: 'seed' }).asPromise();
  }, 120_000);
  afterAll(async () => { await conn?.close(); await srv?.stop(); });
  beforeEach(async () => { await conn.collection('legal_policies').deleteMany({}); });

  it('the repository texts carry the same version in Arabic and English, and say they are a draft', () => {
    const t = loadDraftTexts(DOCS);
    expect(t.version).toBe('1.1');
    expect(t.ar).toContain('لم يعتمدها محامٍ سعودي');
    expect(t.en).toContain('no Saudi lawyer has approved');
  });

  it('a version mismatch is refused', () => {
    const fs = require('fs');
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legal-'));
    fs.writeFileSync(path.join(dir, '03_PROVIDER_AGREEMENT.ar.md'), '**الإصدار:** 1.1\nنص');
    fs.writeFileSync(path.join(dir, '03_PROVIDER_AGREEMENT.en.md'), '**Version:** 1.2\ntext');
    expect(() => loadDraftTexts(dir)).toThrow(/same version/);
  });

  it('a dry run writes nothing', async () => {
    const t = loadDraftTexts(DOCS);
    expect(await seedDraft(conn.db as any, t, false)).toBe('dry-run-would-create');
    expect(await conn.collection('legal_policies').countDocuments()).toBe(0);
  });

  it('creates a DRAFT that nobody is asked to accept and that is not the published key', async () => {
    const t = loadDraftTexts(DOCS);
    expect(await seedDraft(conn.db as any, t, true)).toBe('created');
    const d: any = await conn.collection('legal_policies').findOne({ key: DRAFT_KEY });
    expect(d).toMatchObject({ status: 'DRAFT', version: '1.1', requires_acceptance: false, applies_to: ['provider'] });
    expect(d.content_ar).toBe(t.ar);
    expect(d.content_en).toBe(t.en);
    expect(await conn.collection('legal_policies').countDocuments({ key: 'provider_agreement' })).toBe(0);
  });

  it('never touches an existing published provider_agreement', async () => {
    await conn.collection('legal_policies').insertOne({ key: 'provider_agreement', version: '1.0', content_ar: 'published text', requires_acceptance: true });
    await seedDraft(conn.db as any, loadDraftTexts(DOCS), true);
    const live: any = await conn.collection('legal_policies').findOne({ key: 'provider_agreement' });
    expect(live).toMatchObject({ version: '1.0', content_ar: 'published text', requires_acceptance: true });
  });

  it('is idempotent, and a changed text replaces the draft with a change-log line', async () => {
    const t = loadDraftTexts(DOCS);
    await seedDraft(conn.db as any, t, true);
    expect(await seedDraft(conn.db as any, t, true)).toBe('unchanged');
    expect(await seedDraft(conn.db as any, { ...t, en: t.en + '\nextra' }, true)).toBe('updated');
    const d: any = await conn.collection('legal_policies').findOne({ key: DRAFT_KEY });
    expect(d.change_log).toHaveLength(2);
    expect(await conn.collection('legal_policies').countDocuments({ key: DRAFT_KEY })).toBe(1);
  });
});
