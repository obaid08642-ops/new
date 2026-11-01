import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DRAFT_KEY, POLICIES, PolicyDef, Texts, compareVersions, loadPolicyTexts, parsePolicyKeys, publishPolicies } from './publish-legal-policy';

const DOCS = path.resolve(__dirname, '../../../docs/legal');
const NOW = new Date('2026-11-02T08:00:00Z');
const def = (k: string): PolicyDef => POLICIES.find((p) => p.key === k)!;

function tmpDocs(ar: string, en: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legal-'));
  fs.writeFileSync(path.join(dir, '03_PROVIDER_AGREEMENT.ar.md'), ar);
  fs.writeFileSync(path.join(dir, '03_PROVIDER_AGREEMENT.en.md'), en);
  return dir;
}

describe('the launch legal texts in the repository', () => {
  it('all five load: same version in Arabic and English, no draft wording, no blank brackets', () => {
    for (const p of POLICIES) {
      const t = loadPolicyTexts(DOCS, p);
      expect(t.version).toBe('1.0');
      expect(t.ar.length).toBeGreaterThan(500);
      expect(t.en.length).toBeGreaterThan(500);
    }
  });

  it('say the platform name and the fixed figures of the code (refund policy, commission defaults)', () => {
    const t = (k: string) => loadPolicyTexts(DOCS, def(k));
    expect(t('patient_terms').ar).toContain('منصة نبض الطبية');
    expect(t('provider_agreement').en).toContain('Nabd Medical Platform');
    // backend/src/modules/refund-policy/refund-policy.defaults.ts: 2 h, 50 %, 0 %, trip fee 40
    expect(t('refund_policy').ar).toMatch(/بساعتين أو أكثر \| 100%/);
    expect(t('refund_policy').ar).toMatch(/بأقل من ساعتين \| 50%/);
    expect(t('refund_policy').ar).toContain('40 ريالاً');
    expect(t('refund_policy').en).toContain('SAR 40');
  });

  it('a blank, draft wording or a version mismatch is refused', () => {
    const d = def('provider_agreement');
    expect(() => loadPolicyTexts(tmpDocs('**الإصدار:** 1.0\nالسجل [ ]', '**Version:** 1.0\ntext'), d)).toThrow(/blank/);
    expect(() => loadPolicyTexts(tmpDocs('**الإصدار:** 1.0\nمسودة', '**Version:** 1.0\ntext'), d)).toThrow(/draft/);
    expect(() => loadPolicyTexts(tmpDocs('**الإصدار:** 1.0\nنص', '**Version:** 1.0\nThis is a draft'), d)).toThrow(/draft/);
    expect(() => loadPolicyTexts(tmpDocs('**الإصدار:** 1.0\nنص', '**Version:** 1.1\ntext'), d)).toThrow(/same version/);
  });
});

describe('selecting keys', () => {
  it('"all" is the five keys in the safe order, the provider agreement last', () => {
    expect(parsePolicyKeys('all').map((p) => p.key)).toEqual(['privacy_policy', 'patient_terms', 'telehealth_consent', 'refund_policy', 'provider_agreement']);
  });
  it('lists are re-ordered, unknown keys refused, the default is the provider agreement', () => {
    expect(parsePolicyKeys('provider_agreement, patient_terms').map((p) => p.key)).toEqual(['patient_terms', 'provider_agreement']);
    expect(() => parsePolicyKeys('patient_terms nope')).toThrow(/unknown policy key/);
    expect(parsePolicyKeys(undefined).map((p) => p.key)).toEqual(['provider_agreement']);
  });
  it('compares versions numerically', () => {
    expect(compareVersions('1.0', '1.0')).toBe(0);
    expect(compareVersions('1.9', '1.10')).toBe(-1);
    expect(compareVersions('2.0', '1.9')).toBe(1);
  });
});

describe('publishing', () => {
  let srv: MongoMemoryServer;
  let conn: mongoose.Connection;
  const col = (n: string) => conn.collection(n);
  const textsFor = (defs: PolicyDef[], version = '1.0'): Record<string, Texts> => Object.fromEntries(defs.map((d) => [d.key, { ar: `نص ${d.key}`, en: `text ${d.key}`, version }]));
  beforeAll(async () => {
    srv = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(srv.getUri(), { dbName: 'pub' }).asPromise();
  }, 120_000);
  afterAll(async () => { await conn?.close(); await srv?.stop(); });
  beforeEach(async () => { for (const n of ['legal_policies', 'legal_policy_backups', 'legal_policy_snapshots']) await col(n).deleteMany({}); });
  const run = (defs: PolicyDef[], o: Partial<{ apply: boolean; requireAcceptance: boolean; allowRegistrationBlock: boolean }> = {}, version = '1.0') =>
    publishPolicies(conn.db as any, defs, textsFor(defs, version), { apply: true, requireAcceptance: true, now: NOW, ...o });
  const all = POLICIES;

  it('a dry run writes nothing and says what it would publish', async () => {
    const r = await run(all, { apply: false });
    expect(r.outcomes.map((o) => o.result)).toEqual(Array(5).fill('dry-run-would-publish'));
    expect(await col('legal_policies').countDocuments()).toBe(0);
    expect(await col('legal_policy_backups').countDocuments()).toBe(0);
  });

  it('publishes all five with the values the clients depend on', async () => {
    const r = await run(all);
    expect(r.outcomes.every((o) => o.result === 'published')).toBe(true);
    expect(r.registrationReady).toBe(true);
    const row = async (k: string): Promise<any> => col('legal_policies').findOne({ key: k });
    for (const k of ['privacy_policy', 'patient_terms', 'telehealth_consent']) expect(await row(k)).toMatchObject({ status: 'PUBLISHED', requires_acceptance: true, version: '1.0', effective_date: NOW });
    expect(await row('refund_policy')).toMatchObject({ requires_acceptance: false });
    expect(await row('provider_agreement')).toMatchObject({ requires_acceptance: true, applies_to: ['provider'] });
    expect(await row('patient_terms')).toMatchObject({ applies_to: ['patient'], content_ar: 'نص patient_terms' });
    expect(await col('legal_policy_snapshots').countDocuments()).toBe(5);
  });

  it('REQUIRE_ACCEPTANCE=no changes only the provider agreement', async () => {
    await run(all, { requireAcceptance: false });
    expect(await col('legal_policies').findOne({ key: 'provider_agreement' })).toMatchObject({ requires_acceptance: false });
    expect(await col('legal_policies').findOne({ key: 'patient_terms' })).toMatchObject({ requires_acceptance: true });
    expect(await col('legal_policies').findOne({ key: 'telehealth_consent' })).toMatchObject({ requires_acceptance: true });
  });

  it('REFUSES to publish the provider agreement alone: no new patient could register', async () => {
    await expect(run([def('provider_agreement')])).rejects.toThrow(/no new patient could register/);
    expect(await col('legal_policies').countDocuments()).toBe(0);
    await expect(run([def('refund_policy')])).rejects.toThrow(/no new patient could register/);
  });

  it('refuses when patient_terms exists but without acceptance required, and allows it when patient docs are already live', async () => {
    await col('legal_policies').insertMany([{ key: 'patient_terms', version: '0.1', requires_acceptance: false }, { key: 'privacy_policy', version: '0.1', requires_acceptance: true }]);
    await expect(run([def('provider_agreement')])).rejects.toThrow(/no new patient could register/);
    await col('legal_policies').updateOne({ key: 'patient_terms' }, { $set: { requires_acceptance: true } });
    const r = await run([def('provider_agreement')]);
    expect(r.outcomes[0].result).toBe('published');
  });

  it('can be forced past the registration check on purpose', async () => {
    const r = await run([def('provider_agreement')], { allowRegistrationBlock: true });
    expect(r.registrationReady).toBe(false);
    expect(r.outcomes[0].result).toBe('published');
  });

  it('backs up an existing row first, keeps its change log, and retires the draft row (backed up too)', async () => {
    await col('legal_policies').insertMany([
      { key: 'provider_agreement', version: '0.9', content_ar: 'older', change_log: [{ version: '0.9' }], requires_acceptance: true },
      { key: DRAFT_KEY, version: '1.1', status: 'DRAFT', content_ar: 'old draft' },
    ]);
    const r = await run(all);
    const pa = r.outcomes.find((o) => o.key === 'provider_agreement')!;
    expect(pa.previousVersion).toBe('0.9');
    expect(pa.draftRetired).toBe(true);
    expect(pa.backupIds).toHaveLength(2);
    expect(await col('legal_policy_backups').findOne({ backup_of: 'provider_agreement' })).toMatchObject({ version: '0.9', content_ar: 'older' });
    expect(await col('legal_policy_backups').findOne({ backup_of: DRAFT_KEY })).toMatchObject({ content_ar: 'old draft' });
    expect(await col('legal_policies').countDocuments({ key: DRAFT_KEY })).toBe(0);
    expect((await col('legal_policies').findOne({ key: 'provider_agreement' }) as any).change_log).toHaveLength(2);
  });

  it('is idempotent, and refuses to rewrite or lower a published version without writing anything', async () => {
    await run(all);
    expect((await run(all)).outcomes.map((o) => o.result)).toEqual(Array(5).fill('unchanged'));
    const edited = textsFor(all); edited.patient_terms.en = 'edited';
    await expect(publishPolicies(conn.db as any, all, edited, { apply: true, requireAcceptance: true, now: NOW })).rejects.toThrow(/patient_terms: a version 1.0 is already published/);
    await col('legal_policies').updateOne({ key: 'refund_policy' }, { $set: { version: '2.0' } });
    await expect(run(all)).rejects.toThrow(/refund_policy: a version 2.0 is already published/);
    expect(await col('legal_policy_backups').countDocuments()).toBe(0);
  });

  it('a refusal on one key writes nothing for the others (checked before the first write)', async () => {
    await col('legal_policies').insertMany([{ key: 'privacy_policy', version: '3.0', requires_acceptance: true }, { key: 'patient_terms', version: '1.0', requires_acceptance: true }]);
    await expect(run(all)).rejects.toThrow(/privacy_policy: a version 3.0 is already published/);
    expect(await col('legal_policies').countDocuments()).toBe(2);
    expect(await col('legal_policy_backups').countDocuments()).toBe(0);
  });

  it('a higher version replaces the published one and keeps the older snapshot', async () => {
    await run(all);
    const r = await run([def('patient_terms')], {}, '2.0');
    expect(r.outcomes[0]).toMatchObject({ result: 'published', previousVersion: '1.0', version: '2.0' });
    expect(await col('legal_policy_snapshots').countDocuments({ key: 'patient_terms' })).toBe(2);
  });
});
