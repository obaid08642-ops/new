#!/usr/bin/env node
'use strict';

/**
 * MANUAL, EXPLICIT migration. Never auto-run from application bootstrap.
 * Run only after duplicate audit and an approved isolated maintenance window.
 */
const { MongoClient } = require('mongodb');

async function main() {
  if (process.env.ALLOW_EXPLICIT_PHARMACY_MIGRATION !== 'true') {
    throw new Error('Refusing migration: set ALLOW_EXPLICIT_PHARMACY_MIGRATION=true explicitly');
  }
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL required');
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(process.env.DB_NAME || 'nabd_nestjs');
    const collection = db.collection('pharmacy_payment_evidence');
    const duplicateGroups = await collection.aggregate([
      { $group: { _id: { gateway: '$gateway', gateway_payment_id: '$gateway_payment_id', webhook_event_id: '$webhook_event_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ]).toArray();
    if (duplicateGroups.length) throw new Error('Duplicate payment evidence business keys exist; reconcile before indexing');
    await collection.createIndex({ gateway: 1, gateway_payment_id: 1, webhook_event_id: 1 }, { unique: true, name: 'payment_evidence_gateway_event_unique' });
    await collection.createIndex({ order_id: 1, selected_offer_id: 1, selected_offer_version: 1, quote_snapshot_hash: 1, status: 1 }, { name: 'payment_evidence_quote_lookup' });
  } finally {
    await client.close();
  }
}

if (require.main === module) main().catch(err => { console.error(err.message); process.exit(1); });
