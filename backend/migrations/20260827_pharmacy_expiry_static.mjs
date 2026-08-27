/*
 * Static migration artifact only. CI must not execute it and this PR does not
 * connect to production. Run explicitly against a backup-verified environment:
 *   MONGODB_URI='...' node backend/migrations/20260827_pharmacy_expiry_static.mjs up
 * Reverse only the new indexes; no data document is deleted by down.
 */
import { MongoClient } from 'mongodb';

const mode = process.argv[2];
if (!['up', 'down'].includes(mode)) throw new Error('usage: node 20260827_pharmacy_expiry_static.mjs <up|down>');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

const definitions = [
  ['pharmacy_offers', 'pharmacy_offer_expiry_scan_v1', { status: 1, expires_at: 1, id: 1 }, {}],
  ['pharmacy_broadcasts', 'pharmacy_broadcast_expiry_scan_v1', { lock_state: 1, expires_at: 1, id: 1 }, {}],
  ['pharmacy_expiry_audits', 'pharmacy_expiry_audit_dedupe_v1', { entity_type: 1, entity_id: 1, event_version: 1 }, { unique: true }],
  ['pharmacy_lifecycle_outbox', 'pharmacy_lifecycle_outbox_dedupe_v1', { dedupe_key: 1 }, { unique: true }],
  ['pharmacy_lifecycle_outbox', 'pharmacy_lifecycle_outbox_poll_v1', { status: 1, available_at: 1 }, {}],
  ['pharmacy_expiry_leases', 'pharmacy_expiry_lease_key_v1', { lease_key: 1 }, { unique: true }],
];

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const db = client.db();
  for (const [collection, name, keys, options] of definitions) {
    if (mode === 'up') await db.collection(collection).createIndex(keys, { ...options, name });
    else {
      const exists = await db.listCollections({ name: collection }, { nameOnly: true }).hasNext();
      if (exists) await db.collection(collection).dropIndex(name).catch((error) => { if (error.codeName !== 'IndexNotFound') throw error; });
    }
  }
} finally {
  await client.close();
}
