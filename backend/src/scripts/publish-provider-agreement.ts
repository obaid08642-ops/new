/**
 * Publishes the provider agreement (docs/legal/03_PROVIDER_AGREEMENT.ar.md and .en.md) as `legal_policies` key `provider_agreement`, status PUBLISHED.
 * This is the text `ProviderAgreementGuard`, registration submit and the signed contract PDF use (the PDF prints exactly the accepted text and version).
 *
 *   dry run (default):  MONGO_URL=... DB_NAME=... npx ts-node src/scripts/publish-provider-agreement.ts
 *   publish:            APPLY=yes MONGO_URL=... DB_NAME=... npx ts-node src/scripts/publish-provider-agreement.ts
 *   LEGAL_DOCS_DIR      where the two files are (default: docs/legal at the repository root)
 *   REQUIRE_ACCEPTANCE  yes (default) | no. With "yes" every provider must accept the published version in the app before the /provider/ routes answer
 *                       (403 provider_agreement_required): publish when the app build with the contract gate is out.
 *
 * What APPLY=yes does, in this order, and stops at the first refusal:
 *   1. refuses a text that still says "draft" or still has a blank [ ], or whose Arabic and English versions differ;
 *   2. refuses to publish a version that is not higher than the published one (a published version is never rewritten: acceptances and
 *      the contract PDF are tied to it), and says "unchanged" for the same text;
 *   3. copies the existing `provider_agreement` row and the draft row into `legal_policy_backups` (never deleted by this script);
 *   4. writes `provider_agreement` (effective date = the publish date, a change-log line) and the immutable copy in `legal_policy_snapshots`;
 *   5. retires the `provider_agreement_draft` row (the copy from step 3 stays).
 */
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import mongoose from 'mongoose';

export const POLICY_KEY = 'provider_agreement';
export const DRAFT_KEY = 'provider_agreement_draft';
const AR_FILE = '03_PROVIDER_AGREEMENT.ar.md';
const EN_FILE = '03_PROVIDER_AGREEMENT.en.md';

const sha = (t: unknown) => createHash('sha256').update(String(t ?? '')).digest('hex');
const versionParts = (v: unknown) => String(v ?? '0').split('.').map((n) => Number(n) || 0);
export function compareVersions(a: unknown, b: unknown): number {
  const x = versionParts(a), y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}

export type Texts = { ar: string; en: string; version: string };

export function loadAgreementTexts(dir: string): Texts {
  const ar = fs.readFileSync(path.join(dir, AR_FILE), 'utf8');
  const en = fs.readFileSync(path.join(dir, EN_FILE), 'utf8');
  const version = /\*\*الإصدار:\*\*\s*([0-9]+(?:\.[0-9]+)*)/.exec(ar)?.[1];
  const enVersion = /\*\*Version:\*\*\s*([0-9]+(?:\.[0-9]+)*)/.exec(en)?.[1];
  if (!version || version !== enVersion) throw new Error(`the Arabic and English files must carry the same version (ar=${version}, en=${enVersion})`);
  for (const [name, text] of [['ar', ar], ['en', en]] as const) {
    if (/\[\s*\]/.test(text)) throw new Error(`${name}: a blank [ ] is left in the text`);
    if (/مسودة|\bdraft\b/i.test(text)) throw new Error(`${name}: the text still says "draft"`);
  }
  return { ar, en, version };
}

export type PublishResult = 'dry-run-would-publish' | 'published' | 'unchanged';

export type PublishOutcome = { result: PublishResult; previousVersion: string | null; draftRetired: boolean; backupIds: string[]; sha_ar: string; sha_en: string };

export async function publishAgreement(db: mongoose.mongo.Db, texts: Texts, opts: { apply: boolean; requireAcceptance: boolean; now?: Date }): Promise<PublishOutcome> {
  const policies = db.collection('legal_policies');
  const now = opts.now ?? new Date();
  const hash = sha(texts.ar) + ':' + sha(texts.en);
  const hashes = { sha_ar: sha(texts.ar).slice(0, 12), sha_en: sha(texts.en).slice(0, 12) };
  const existing: any = await policies.findOne({ key: POLICY_KEY });
  const draft: any = await policies.findOne({ key: DRAFT_KEY });
  if (existing) {
    const same = compareVersions(existing.version, texts.version);
    if (same === 0 && existing.source_sha256 === hash && String(existing.status || 'PUBLISHED') === 'PUBLISHED') {
      return { result: 'unchanged', previousVersion: String(existing.version), draftRetired: false, backupIds: [], ...hashes };
    }
    if (same >= 0) throw new Error(`a version ${existing.version} is already published; publish a higher version than it (a published version is never rewritten)`);
  }
  const previousVersion = existing ? String(existing.version) : null;
  if (!opts.apply) return { result: 'dry-run-would-publish', previousVersion, draftRetired: !!draft, backupIds: [], ...hashes };

  const backups = db.collection('legal_policy_backups');
  const backupIds: string[] = [];
  for (const row of [existing, draft]) {
    if (row) { const { _id, ...rest } = row; const ins = await backups.insertOne({ ...rest, backup_of: row.key, backed_up_at: now, reason: 'provider agreement publish' } as any); backupIds.push(String(ins.insertedId)); }
  }
  const fields = {
    title_ar: 'اتفاقية مقدم الخدمة',
    title_en: 'Provider Agreement',
    version: texts.version,
    status: 'PUBLISHED',
    effective_date: now,
    last_updated: now,
    content_ar: texts.ar,
    content_en: texts.en,
    requires_acceptance: opts.requireAcceptance,
    applies_to: ['provider'],
    source_sha256: hash,
  };
  const note = { version: texts.version, date: now, note: existing ? `published over ${existing.version} (backup in legal_policy_backups)` : 'first publication', by: 'publish-script' };
  if (existing) await policies.updateOne({ key: POLICY_KEY }, { $set: fields, $push: { change_log: note } } as any);
  else await policies.insertOne({ key: POLICY_KEY, change_log: [note], ...fields } as any);

  // the immutable copy the contract PDF prints (same shape as the legal service writes)
  await db.collection('legal_policy_snapshots').updateOne({ key: POLICY_KEY, version: texts.version }, {
    $setOnInsert: {
      key: POLICY_KEY, version: texts.version, title_ar: fields.title_ar, title_en: fields.title_en,
      content_ar: texts.ar, content_en: texts.en, content_sha256_ar: sha(texts.ar), content_sha256_en: sha(texts.en),
      effective_date: now, createdAt: now,
    },
  } as any, { upsert: true });

  let draftRetired = false;
  if (draft) { await policies.deleteOne({ key: DRAFT_KEY }); draftRetired = true; }
  return { result: 'published', previousVersion, draftRetired, backupIds, ...hashes };
}

async function main() {
  const { MONGO_URL, DB_NAME } = process.env;
  if (!MONGO_URL) { console.error('MONGO_URL is required'); process.exit(1); }
  const dir = process.env.LEGAL_DOCS_DIR || path.resolve(__dirname, '../../../docs/legal');
  const texts = loadAgreementTexts(dir);
  const apply = process.env.APPLY === 'yes';
  const requireAcceptance = (process.env.REQUIRE_ACCEPTANCE || 'yes').toLowerCase() !== 'no';
  await mongoose.connect(MONGO_URL, { dbName: DB_NAME || 'nabd_nestjs' });
  try {
    const r = await publishAgreement(mongoose.connection.db as any, texts, { apply, requireAcceptance });
    // one machine-readable line for the ops task (numbers, hashes of the first 12 characters and row ids only, never a text)
    console.log(JSON.stringify({ step: 'publish', version: texts.version, result: r.result, published: r.result === 'published', previous_version: r.previousVersion, draft_retired: r.draftRetired, backup_ids: r.backupIds, sha_ar: r.sha_ar, sha_en: r.sha_en, acceptance_required: requireAcceptance }));
    console.log(`provider agreement ${texts.version}: ${r.result}${apply ? '' : ' (dry run: APPLY=yes publishes)'}; previous published version: ${r.previousVersion ?? 'none'}; draft row ${r.draftRetired ? 'retired' : 'not present or not touched'}`);
    if (r.result !== 'unchanged') console.log(requireAcceptance
      ? 'acceptance REQUIRED: every provider must accept this version in the app before the /provider/ routes answer; publish when the app build with the contract gate is out'
      : 'acceptance not required (REQUIRE_ACCEPTANCE=no): providers are not locked out; new registrations still accept it before they sign');
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main().catch((e) => { console.error(String(e?.message || e)); process.exit(1); });
