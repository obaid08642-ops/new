/**
 * Loads the provider agreement DRAFT (docs/legal/03_PROVIDER_AGREEMENT.ar.md and .en.md) into `legal_policies`.
 *
 * Stored under the key `provider_agreement_draft`, never under `provider_agreement`: that key is the one registration submit needs
 * published, the one `ProviderAgreementGuard` enforces and the one the contract PDF prints. A draft stored there would be served and
 * printed as if a lawyer had approved it. The draft has status DRAFT and `requires_acceptance: false`, so nobody is asked to accept it.
 * After a Saudi lawyer approves the text, the admin publishes it with PUT /admin/legal/policy/provider_agreement (major: true).
 *
 *   dry run (default):  MONGO_URL=... DB_NAME=... npx ts-node src/scripts/seed-provider-agreement-draft.ts
 *   write:              APPLY=yes MONGO_URL=... DB_NAME=... npx ts-node src/scripts/seed-provider-agreement-draft.ts
 *   LEGAL_DOCS_DIR      where the two files are (default: docs/legal at the repository root)
 * Re-running with the same text changes nothing (the SHA-256 of the text is kept); a changed text replaces the draft and adds a change-log line.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import mongoose from 'mongoose';

export const DRAFT_KEY = 'provider_agreement_draft';
const AR_FILE = '03_PROVIDER_AGREEMENT.ar.md';
const EN_FILE = '03_PROVIDER_AGREEMENT.en.md';

export function loadDraftTexts(dir: string): { ar: string; en: string; version: string } {
  const ar = fs.readFileSync(path.join(dir, AR_FILE), 'utf8');
  const en = fs.readFileSync(path.join(dir, EN_FILE), 'utf8');
  const version = /\*\*(?:الإصدار|Version):\*\*\s*([0-9]+(?:\.[0-9]+)*)/.exec(ar)?.[1];
  const enVersion = /\*\*Version:\*\*\s*([0-9]+(?:\.[0-9]+)*)/.exec(en)?.[1];
  if (!version || version !== enVersion) throw new Error(`the Arabic and English files must carry the same version (ar=${version}, en=${enVersion})`);
  if (!ar.trim() || !en.trim()) throw new Error('empty text');
  return { ar, en, version };
}

export type SeedResult = 'dry-run-would-create' | 'dry-run-would-update' | 'created' | 'updated' | 'unchanged';

export async function seedDraft(db: mongoose.mongo.Db, texts: { ar: string; en: string; version: string }, apply: boolean): Promise<SeedResult> {
  const col = db.collection('legal_policies');
  const sha = createHash('sha256').update(texts.ar).update('\n--\n').update(texts.en).digest('hex');
  const existing: any = await col.findOne({ key: DRAFT_KEY });
  if (existing && existing.source_sha256 === sha && existing.version === texts.version) return 'unchanged';
  if (!apply) return existing ? 'dry-run-would-update' : 'dry-run-would-create';
  const now = new Date();
  const fields = {
    title_ar: 'اتفاقية مقدم الخدمة (مسودة)',
    title_en: 'Provider Agreement (draft)',
    version: texts.version,
    status: 'DRAFT',
    requires_acceptance: false,
    applies_to: ['provider'],
    content_ar: texts.ar,
    content_en: texts.en,
    source_sha256: sha,
    last_updated: now,
  };
  const note = { version: texts.version, date: now, note: 'draft loaded from docs/legal (not approved by a lawyer, not published)', by: 'seed' };
  if (existing) {
    await col.updateOne({ key: DRAFT_KEY }, { $set: fields, $push: { change_log: note } } as any);
    return 'updated';
  }
  await col.insertOne({ key: DRAFT_KEY, effective_date: now, change_log: [note], ...fields } as any);
  return 'created';
}

async function main() {
  const { MONGO_URL, DB_NAME } = process.env;
  if (!MONGO_URL) { console.error('MONGO_URL is required'); process.exit(1); }
  const dir = process.env.LEGAL_DOCS_DIR || path.resolve(__dirname, '../../../docs/legal');
  const texts = loadDraftTexts(dir);
  await mongoose.connect(MONGO_URL, { dbName: DB_NAME || 'nabd_nestjs' });
  const apply = process.env.APPLY === 'yes';
  const r = await seedDraft(mongoose.connection.db as any, texts, apply);
  console.log(`provider agreement draft ${texts.version}: ${r}${apply ? '' : ' (dry run: APPLY=yes writes)'}; key=${DRAFT_KEY}; not published, no acceptance asked`);
  await mongoose.disconnect();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
