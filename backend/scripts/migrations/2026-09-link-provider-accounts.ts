/*
 * P2.1: link every provider_account to its login identity (users.id).
 * For each provider_accounts doc missing user_id, find the user by
 * phone_e164→phone or email→email and set user_id. Prints orphans
 * (no matching user) for manual review — never invents links.
 *
 * DEFAULT IS DRY-RUN: prints planned links + orphan report, writes nothing.
 * Apply with:  node scripts/migrations/2026-09-link-provider-accounts.ts --apply
 * Requires MONGODB_URI. Intended for staging/prod owner runs, never app boot.
 */
const mongoose = require('mongoose');

const DRY = !process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  // Same database the app uses (app.module: DB_NAME || 'nabd_nestjs'); the URI path alone is not enough.
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000, dbName: process.env.DB_NAME || 'nabd_nestjs' });
  const db = mongoose.connection.db;

  const orphans: any[] = [];
  let linked = 0;
  let already = 0;
  const total = await db.collection('provider_accounts').countDocuments({});
  const cursor = db.collection('provider_accounts').find({});
  for await (const acc of cursor as any) {
    if ((acc as any).user_id) { already++; continue; }
    const or: any[] = [];
    if ((acc as any).phone_e164) or.push({ phone: (acc as any).phone_e164 });
    if ((acc as any).email) or.push({ email: String((acc as any).email).toLowerCase().trim() });
    let user: any = null;
    if (or.length) user = await db.collection('users').findOne({ $or: or });
    if (!user) {
      orphans.push({ id: (acc as any).id, email: (acc as any).email || null, phone: (acc as any).phone_e164 || null, status: (acc as any).status || null });
      continue;
    }
    if (!DRY) {
      await db.collection('provider_accounts').updateOne(
        { id: (acc as any).id },
        { $set: { user_id: user.id } },
      );
    }
    linked++;
  }

  console.log(`link-provider-accounts ${DRY ? 'DRY-RUN' : 'APPLIED'}:`, JSON.stringify({ total, already_linked: already, linked, orphans: orphans.length }));
  for (const o of orphans) console.log('  orphan:', JSON.stringify(o));
  // P2.1 verify criterion: zero accounts without user_id after apply.
  const remaining = DRY
    ? total - already - linked
    : await db.collection('provider_accounts').countDocuments({ user_id: { $exists: false } });
  console.log('remaining without user_id:', remaining);
  await mongoose.disconnect();
}

main().catch((e) => { console.error('link-provider-accounts failed:', e?.message || e); process.exit(1); });
