/*
 * P3.0b: users is the single source of truth for passwords.
 *
 * For every provider_accounts doc, resolve the linked users row (user_id →
 * shared id → email) and reconcile the two hashes — USERS WINS:
 *   - both real and different      → provider_accounts.password_hash := users hash
 *   - account has placeholder      → provider_accounts.password_hash := users hash
 *   - users has NO hash, account has a real one → users.password_hash := account hash
 *     (the only case the account value is kept; otherwise the provider is locked out)
 *   - link resolved by fallback    → user_id written
 * Orphans (no users row) are listed, never invented. Login no longer reads
 * provider_accounts.password_hash; aligning it only keeps a code rollback safe.
 *
 * DEFAULT IS DRY-RUN: prints the counts, writes nothing.
 * Apply with:  npx ts-node scripts/migrations/2026-09-unify-provider-passwords.ts --apply
 * Requires MONGODB_URI. Run AFTER 2026-09-link-provider-accounts.ts.
 */
import { unifyProviderPasswords } from '../../src/modules/provider/provider-credential';

const mongoose = require('mongoose');
const APPLY = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  // Same database the app uses (app.module: DB_NAME || 'nabd_nestjs'); the URI path alone is not enough.
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000, dbName: process.env.DB_NAME || 'nabd_nestjs' });
  const report = await unifyProviderPasswords(mongoose.connection.db, { apply: APPLY });
  const { orphans, ...counts } = report;
  console.log(`unify-provider-passwords ${APPLY ? 'APPLIED' : 'DRY-RUN'}:`, JSON.stringify({ ...counts, orphans: orphans.length }));
  for (const o of orphans) console.log('  orphan:', JSON.stringify(o));
  await mongoose.disconnect();
}

main().catch((e) => { console.error('unify-provider-passwords failed:', e?.message || e); process.exit(1); });
