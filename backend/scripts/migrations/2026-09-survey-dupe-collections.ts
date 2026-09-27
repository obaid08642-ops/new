/*
 * P5.2: live-duplicate survey + copy for staging/prod.
 * Pairs: pharmacy_orders→orders, doctor_appointments→appointments,
 *         chat_messages→(keep), pharmacy_chat_*→(keep, read-only).
 * pharmacy_orders/orders and doctor_appointments/appointments are BOTH live
 * (payments-bound flows); do NOT drop on staging without owner sign-off.
 * This script: prints per-collection counts + sample shapes (dry-run default).
 * With --copy: copies missing-by-id docs secondary→canonical with
 * _migrated_from tag (never deletes; deletion is a separate owner step after
 * code redirect + journey verification).
 * Requires MONGODB_URI.
 */
const mongoose = require('mongoose');

const DRY = !process.argv.includes('--copy');
const PAIRS = [
  ['pharmacy_orders', 'orders'],
  ['doctor_appointments', 'appointments'],
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  for (const [sec, canon] of PAIRS) {
    const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
    const ns = names.has(sec) ? await db.collection(sec).countDocuments() : 'absent';
    const nc = names.has(canon) ? await db.collection(canon).countDocuments() : 'absent';
    console.log(JSON.stringify({ pair: `${sec}->${canon}`, secondary: ns, canonical: nc, dry_run: DRY }));
    if (!DRY && typeof ns === 'number' && ns > 0) {
      const canonIds = new Set(await db.collection(canon).distinct('id'));
      const missing = await db.collection(sec).find({ id: { $nin: [...canonIds] } }).toArray();
      if (missing.length) {
        await db.collection(canon).insertMany(missing.map((d) => ({ ...d, _migrated_from: sec, migrated_at: new Date() })));
      }
      console.log(JSON.stringify({ copied: missing.length }));
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
