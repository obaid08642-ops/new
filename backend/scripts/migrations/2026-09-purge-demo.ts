/*
 * F17: purge demo/seed records created by production seeders.
 * Soft-deletes (never hard-deletes) every record matching a demo marker:
 *   - provider_profiles with user_id starting 'system-seed-' or approved_by 'system-seed'
 *   - users with @test.com emails
 *   - provider_accounts with @test.com emails
 * Soft-delete also neutralizes access: users are deactivated (+token_version
 * bump kills live sessions), provider_accounts move to 'rejected' (guard
 * blocks all ops), profiles lose public/indexing eligibility.
 *
 * DEFAULT IS DRY-RUN: prints per-collection match counts and changes nothing.
 * Apply with:  node scripts/migrations/2026-09-purge-demo.ts --apply
 * Requires MONGODB_URI. Intended for staging/prod owner runs, never app boot.
 */
const mongoose = require('mongoose');

const DRY = !process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const now = new Date();
  const counts: Record<string, any> = {};

  // 1) Seeded provider profiles (random ratings, fake licenses, system-seed provenance).
  const profileFilter = { $or: [{ user_id: { $regex: '^system-seed-' } }, { approved_by: 'system-seed' }] };
  counts.provider_profiles = await db.collection('provider_profiles').countDocuments(profileFilter);
  if (!DRY && counts.provider_profiles) {
    await db.collection('provider_profiles').updateMany(profileFilter, {
      $set: { is_deleted: true, deleted_at: now, public_eligibility: false, indexing_eligibility: false, status: 'SUSPENDED' },
    });
  }

  // 2) Demo users (@test.com). Deactivation blocks login; tv bump kills sessions.
  const userFilter = { email: { $regex: '@test\\.com$', $options: 'i' } };
  counts.users = await db.collection('users').countDocuments(userFilter);
  if (!DRY && counts.users) {
    await db.collection('users').updateMany(userFilter, {
      $set: { active: false, suspended: true, deleted_at: now },
      $inc: { token_version: 1 },
    });
  }

  // 3) Demo provider accounts (@test.com). 'rejected' keeps enum validity and
  // fails the provider-approval gate on every operational route.
  const accountFilter = { email: { $regex: '@test\\.com$', $options: 'i' } };
  counts.provider_accounts = await db.collection('provider_accounts').countDocuments(accountFilter);
  if (!DRY && counts.provider_accounts) {
    await db.collection('provider_accounts').updateMany(accountFilter, {
      $set: { status: 'rejected', deleted_at: now },
      $inc: { token_version: 1 },
    });
  }

  // 4) Orphaned demo inventory rows pointing at purged pharmacy accounts
  // (scoped to the accounts purged in this run; skipped on dry-run).
  counts.inventory_rows = 0;
  if (!DRY) {
    const purgedAccountIds = await db.collection('provider_accounts')
      .find({ ...accountFilter, deleted_at: now }, { projection: { id: 1 } })
      .toArray().then((rows) => rows.map((r) => r.id)).catch(() => []);
    if (purgedAccountIds.length) {
      const r = await db.collection('pharmacy_inventories').updateMany(
        { pharmacy_id: { $in: purgedAccountIds } },
        { $set: { is_deleted: true, deleted_at: now, is_available: false } },
      ).catch(() => ({ modifiedCount: 0 }));
      counts.inventory_rows = r.modifiedCount || 0;
    }
  }

  console.log(`purge-demo ${DRY ? 'DRY-RUN' : 'APPLIED'}:`, JSON.stringify(counts));
  await mongoose.disconnect();
}

main().catch((e) => { console.error('purge-demo failed:', e?.message || e); process.exit(1); });
