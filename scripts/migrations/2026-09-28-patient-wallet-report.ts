/**
 * Phase 7A-A3 — patient wallet sunset report (DRY-RUN ONLY).
 *
 * Lists every patient wallet with a non-zero balance so the owner can decide
 * what happens next (refund to original method, credit note, …).
 *
 * This script NEVER writes: there is intentionally no `--apply` path and no
 * delete/update call anywhere below. Run with backend deps:
 *   MONGO_URL="mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true" \
 *   DB_NAME=nabd_live npx ts-node scripts/migrations/2026-09-28-patient-wallet-report.ts
 */
import * as path from 'path';

const req = (m: string) => require(path.resolve(__dirname, '../../backend/node_modules', m));
const mongoose = req('mongoose');

async function main() {
  const url = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';
  const dbName = process.env.DB_NAME || 'nabd_live';
  await mongoose.connect(url, { dbName });
  const wallets = mongoose.connection.db.collection('wallets');

  const rows: any[] = await wallets
    .find({ ownerType: 'patient', balance: { $ne: 0 } }, { projection: { _id: 0, id: 1, ownerId: 1, balance: 1, updatedAt: 1 } })
    .sort({ balance: -1 })
    .toArray();

  const total = rows.reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
  console.log('=== patient wallet sunset report (read-only) ===');
  console.log(`wallets with non-zero balance: ${rows.length}`);
  console.log(`total balance (SAR): ${Math.round(total * 100) / 100}`);
  for (const r of rows) {
    console.log(`- wallet=${r.id} owner=${r.ownerId} balance=${r.balance} updated=${r.updatedAt || 'n/a'}`);
  }
  console.log('No writes were made. The owner decides the disposition of these balances.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
