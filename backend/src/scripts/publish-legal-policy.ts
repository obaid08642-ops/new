/**
 * Publishes the launch legal texts (docs/legal/0N_*.ar.md and .en.md) into `legal_policies`, status PUBLISHED. One tool for five keys:
 *   privacy_policy, patient_terms, telehealth_consent, refund_policy, provider_agreement.
 *
 *   dry run (default):  MONGO_URL=... DB_NAME=... POLICIES=all npx ts-node src/scripts/publish-legal-policy.ts
 *   publish:            APPLY=yes MONGO_URL=... DB_NAME=... POLICIES=all npx ts-node src/scripts/publish-legal-policy.ts
 *   POLICIES            "all", or keys separated by spaces or commas (default: provider_agreement)
 *   LEGAL_DOCS_DIR      where the files are (default: docs/legal at the repository root)
 *   REQUIRE_ACCEPTANCE  yes (default) | no, for provider_agreement only: with "yes" every provider must accept the version in the app before the /provider/ routes answer
 *                       (403 provider_agreement_required). The other keys have fixed values (see POLICIES below), because the clients depend on them.
 *   ALLOW_REGISTRATION_BLOCK=yes  lets a run leave patient registration blocked (see the first refusal); never needed in practice.
 *
 * Refusals, all before anything is written:
 *   - a text with "draft" or a blank bracket, or whose Arabic and English versions differ (every selected key is checked first);
 *   - a version that is not higher than the published one (a published version is never rewritten: acceptances and the contract PDF are tied to it);
 *   - a state in which some policy exists but `patient_terms` or `privacy_policy` would not be published WITH acceptance required. Both patient clients
 *     (app `currentConsents`, web `api/auth/register`) then answer registration_policy_configuration_missing, so NO NEW PATIENT CAN REGISTER.
 * What APPLY=yes does, key by key in a safe order (patient texts first, the provider agreement last): copies the existing row to `legal_policy_backups`,
 * writes the row (PUBLISHED, effective date = the publish date, a change-log line) and the immutable copy in `legal_policy_snapshots`; for
 * provider_agreement it also retires the `provider_agreement_draft` row (backed up first).
 */
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import mongoose from 'mongoose';

export const DRAFT_KEY = 'provider_agreement_draft';

export interface PolicyDef { key: string; file: string; title_ar: string; title_en: string; applies_to: string[]; requires_acceptance: boolean | 'env' }

/** Publishing order: the texts patients need to register come first, the provider agreement last. */
export const POLICIES: PolicyDef[] = [
  { key: 'privacy_policy', file: '02_PRIVACY_POLICY', title_ar: 'سياسة الخصوصية', title_en: 'Privacy Policy', applies_to: ['all'], requires_acceptance: true },
  { key: 'patient_terms', file: '01_PATIENT_TERMS', title_ar: 'شروط الاستخدام', title_en: 'Terms of Use', applies_to: ['patient'], requires_acceptance: true },
  // true: with false hasTelehealthConsent() answers "nothing to accept" and the consent is never asked
  { key: 'telehealth_consent', file: '04_TELEHEALTH_CONSENT', title_ar: 'الموافقة على الاستشارة عن بُعد', title_en: 'Consent to Remote Consultation', applies_to: ['patient'], requires_acceptance: true },
  // shown before payment, not a separate acceptance
  { key: 'refund_policy', file: '05_CANCELLATION_REFUND', title_ar: 'سياسة الإلغاء والاسترداد', title_en: 'Cancellation and Refund Policy', applies_to: ['all'], requires_acceptance: false },
  { key: 'provider_agreement', file: '03_PROVIDER_AGREEMENT', title_ar: 'اتفاقية مقدم الخدمة', title_en: 'Provider Agreement', applies_to: ['provider'], requires_acceptance: 'env' },
];
const REGISTRATION_KEYS = ['patient_terms', 'privacy_policy'];

const sha = (t: unknown) => createHash('sha256').update(String(t ?? '')).digest('hex');
const versionParts = (v: unknown) => String(v ?? '0').split('.').map((n) => Number(n) || 0);
export function compareVersions(a: unknown, b: unknown): number {
  const x = versionParts(a), y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}

export type Texts = { ar: string; en: string; version: string };

export function parsePolicyKeys(raw: string | undefined): PolicyDef[] {
  const want = String(raw || 'provider_agreement').split(/[\s,]+/).filter(Boolean);
  if (want.includes('all')) return POLICIES.slice();
  const unknown = want.filter((k) => !POLICIES.some((p) => p.key === k));
  if (unknown.length) throw new Error(`unknown policy key(s): ${unknown.join(', ')}`);
  return POLICIES.filter((p) => want.includes(p.key));   // always in the safe order
}

export function loadPolicyTexts(dir: string, def: PolicyDef): Texts {
  const ar = fs.readFileSync(path.join(dir, `${def.file}.ar.md`), 'utf8');
  const en = fs.readFileSync(path.join(dir, `${def.file}.en.md`), 'utf8');
  const version = /\*\*الإصدار:\*\*\s*([0-9]+(?:\.[0-9]+)*)/.exec(ar)?.[1];
  const enVersion = /\*\*Version:\*\*\s*([0-9]+(?:\.[0-9]+)*)/.exec(en)?.[1];
  if (!version || version !== enVersion) throw new Error(`${def.key}: the Arabic and English files must carry the same version (ar=${version}, en=${enVersion})`);
  for (const [name, text] of [['ar', ar], ['en', en]] as const) {
    if (/\[\s*\]/.test(text)) throw new Error(`${def.key} ${name}: a blank [ ] is left in the text`);
    if (/مسودة|\bdraft\b/i.test(text)) throw new Error(`${def.key} ${name}: the text still says "draft"`);
  }
  return { ar, en, version };
}

export type PublishResult = 'dry-run-would-publish' | 'published' | 'unchanged';
export type PublishOutcome = { key: string; result: PublishResult; version: string; previousVersion: string | null; draftRetired: boolean; backupIds: string[]; sha_ar: string; sha_en: string; acceptance_required: boolean };
export type RunOutcome = { outcomes: PublishOutcome[]; registrationReady: boolean };

/** Would patient registration work after this run? (Both clients need an acceptance-requiring patient_terms and privacy_policy as soon as any policy exists.) */
async function registrationReady(db: mongoose.mongo.Db, selected: PolicyDef[]): Promise<boolean> {
  const rows: any[] = await db.collection('legal_policies').find({}, { projection: { key: 1, requires_acceptance: 1 } }).toArray();
  if (!rows.length && !selected.length) return true;
  const ok = (k: string) => selected.some((p) => p.key === k) || rows.some((r) => r.key === k && r.requires_acceptance !== false);
  return REGISTRATION_KEYS.every(ok);
}

export async function publishPolicies(db: mongoose.mongo.Db, defs: PolicyDef[], texts: Record<string, Texts>, opts: { apply: boolean; requireAcceptance: boolean; allowRegistrationBlock?: boolean; now?: Date }): Promise<RunOutcome> {
  const policies = db.collection('legal_policies');
  const now = opts.now ?? new Date();
  const ready = await registrationReady(db, defs);
  if (!ready && !opts.allowRegistrationBlock) {
    throw new Error('refused: after this run some policy would exist but patient_terms and privacy_policy would not both be published with acceptance required, so no new patient could register (registration_policy_configuration_missing). Publish them in the same run (POLICIES=all)');
  }
  // plan first: every refusal comes before the first write
  const plan = [] as Array<{ def: PolicyDef; t: Texts; existing: any; hash: string; same: boolean }>;
  for (const def of defs) {
    const t = texts[def.key];
    const existing: any = await policies.findOne({ key: def.key });
    const hash = sha(t.ar) + ':' + sha(t.en);
    let same = false;
    if (existing) {
      const cmp = compareVersions(existing.version, t.version);
      if (cmp === 0 && existing.source_sha256 === hash && String(existing.status || 'PUBLISHED') === 'PUBLISHED') same = true;
      else if (cmp >= 0) throw new Error(`${def.key}: a version ${existing.version} is already published; publish a higher version than it (a published version is never rewritten)`);
    }
    plan.push({ def, t, existing, hash, same });
  }
  const outcomes: PublishOutcome[] = [];
  const backups = db.collection('legal_policy_backups');
  for (const { def, t, existing, hash, same } of plan) {
    const acceptance = def.requires_acceptance === 'env' ? opts.requireAcceptance : def.requires_acceptance;
    const base = { key: def.key, version: t.version, previousVersion: existing ? String(existing.version) : null, sha_ar: sha(t.ar).slice(0, 12), sha_en: sha(t.en).slice(0, 12), acceptance_required: acceptance };
    const draft: any = def.key === 'provider_agreement' ? await policies.findOne({ key: DRAFT_KEY }) : null;
    if (same) { outcomes.push({ ...base, result: 'unchanged', draftRetired: false, backupIds: [] }); continue; }
    if (!opts.apply) { outcomes.push({ ...base, result: 'dry-run-would-publish', draftRetired: !!draft, backupIds: [] }); continue; }
    const backupIds: string[] = [];
    for (const row of [existing, draft]) {
      if (row) { const { _id, ...rest } = row; const ins = await backups.insertOne({ ...rest, backup_of: row.key, backed_up_at: now, reason: 'legal policy publish' } as any); backupIds.push(String(ins.insertedId)); }
    }
    const fields = {
      title_ar: def.title_ar, title_en: def.title_en, version: t.version, status: 'PUBLISHED', effective_date: now, last_updated: now,
      content_ar: t.ar, content_en: t.en, requires_acceptance: acceptance, applies_to: def.applies_to, source_sha256: hash,
    };
    const note = { version: t.version, date: now, note: existing ? `published over ${existing.version} (backup in legal_policy_backups)` : 'first publication', by: 'publish-script' };
    if (existing) await policies.updateOne({ key: def.key }, { $set: fields, $push: { change_log: note } } as any);
    else await policies.insertOne({ key: def.key, change_log: [note], ...fields } as any);
    // the immutable copy the contract PDF prints (same shape as the legal service writes)
    await db.collection('legal_policy_snapshots').updateOne({ key: def.key, version: t.version }, {
      $setOnInsert: {
        key: def.key, version: t.version, title_ar: def.title_ar, title_en: def.title_en, content_ar: t.ar, content_en: t.en,
        content_sha256_ar: sha(t.ar), content_sha256_en: sha(t.en), effective_date: now, createdAt: now,
      },
    } as any, { upsert: true });
    let draftRetired = false;
    if (draft) { await policies.deleteOne({ key: DRAFT_KEY }); draftRetired = true; }
    outcomes.push({ ...base, result: 'published', draftRetired, backupIds });
  }
  return { outcomes, registrationReady: ready };
}

async function main() {
  const { MONGO_URL, DB_NAME } = process.env;
  if (!MONGO_URL) { console.error('MONGO_URL is required'); process.exit(1); }
  const dir = process.env.LEGAL_DOCS_DIR || path.resolve(__dirname, '../../../docs/legal');
  const defs = parsePolicyKeys(process.env.POLICIES);
  const texts: Record<string, Texts> = {};
  for (const d of defs) texts[d.key] = loadPolicyTexts(dir, d);   // every selected text is checked before anything is written
  const apply = process.env.APPLY === 'yes';
  const requireAcceptance = (process.env.REQUIRE_ACCEPTANCE || 'yes').toLowerCase() !== 'no';
  await mongoose.connect(MONGO_URL, { dbName: DB_NAME || 'nabd_nestjs' });
  try {
    const r = await publishPolicies(mongoose.connection.db as any, defs, texts, { apply, requireAcceptance, allowRegistrationBlock: process.env.ALLOW_REGISTRATION_BLOCK === 'yes' });
    // machine-readable lines for the ops task (numbers, hashes of the first 12 characters and row ids only, never a text)
    for (const o of r.outcomes) {
      console.log(JSON.stringify({ step: 'publish', key: o.key, version: o.version, result: o.result, published: o.result === 'published', previous_version: o.previousVersion, draft_retired: o.draftRetired, backup_ids: o.backupIds, sha_ar: o.sha_ar, sha_en: o.sha_en, acceptance_required: o.acceptance_required }));
    }
    console.log(JSON.stringify({ step: 'summary', keys: r.outcomes.length, registration_ready: r.registrationReady }));
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main().catch((e) => { console.error(String(e?.message || e)); process.exit(1); });
