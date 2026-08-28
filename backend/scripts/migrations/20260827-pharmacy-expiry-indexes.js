/*
 * Manual, opt-in schema migration for pharmacy expiry commands.
 * It is intentionally NOT invoked by application startup, tests, or a scheduler.
 * Review duplicate outbox keys and take a backup before setting APPLY_DB_MIGRATION=20260827.
 */
const mongoose = require('mongoose');

async function main() {
  if (process.env.APPLY_DB_MIGRATION !== '20260827') {
    throw new Error('refusing_to_run_set_APPLY_DB_MIGRATION_20260827_after_approved_change_window');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const duplicateOutboxKeys = await db.collection('domain_outbox').aggregate([
    { $group: { _id: { aggregate_type: '$aggregate_type', aggregate_id: '$aggregate_id', event_type: '$event_type', idempotency_key: '$idempotency_key' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray();
  if (duplicateOutboxKeys.length) {
    throw new Error('domain_outbox_has_duplicate_idempotency_keys_resolve_before_index_creation');
  }
  const duplicateRecipientKeys = await db.collection('pharmacy_broadcast_recipients').aggregate([
    { $group: { _id: { broadcast_id: '$broadcast_id', pharmacy_account_id: '$pharmacy_account_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray();
  if (duplicateRecipientKeys.length) {
    throw new Error('pharmacy_broadcast_recipients_has_duplicate_memberships_resolve_before_index_creation');
  }
  await db.collection('domain_outbox').createIndex(
    { aggregate_type: 1, aggregate_id: 1, event_type: 1, idempotency_key: 1 },
    { name: 'domain_outbox_pharmacy_idempotency_unique', unique: true },
  );
  await db.collection('pharmacy_offers').createIndex(
    { status: 1, quote_expires_at: 1, id: 1 },
    { name: 'pharmacy_offers_due_expiry_scan' },
  );
  await db.collection('pharmacy_broadcasts').createIndex(
    { lock_state: 1, round_expires_at: 1, id: 1 },
    { name: 'pharmacy_broadcasts_due_expiry_scan' },
  );
  await db.collection('pharmacy_broadcast_recipients').createIndex(
    { broadcast_id: 1, pharmacy_account_id: 1 },
    { name: 'pharmacy_broadcast_recipient_unique', unique: true },
  );
  console.log('pharmacy_expiry_indexes_applied');
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
