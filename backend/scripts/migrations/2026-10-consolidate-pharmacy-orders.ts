/**
 * P5.2: Consolidate pharmacy_orders vs orders (DRY-RUN ONLY).
 * 
 * Two collections with different shapes AND different live writers:
 *   - pharmacy_orders: governed broadcast flow (complex state machine, broadcast, allocations, offers)
 *   - orders: legacy cart checkout (simpler state machine, wallet/coupon/loyalty, finance fields)
 * 
 * Both have active code readers/writers. A mechanical copy would corrupt state machines.
 * This script reports counts by state, id collisions, field coverage, and REFUSES to copy.
 * The copy mapping + dual-write cutover must be reviewed on staging.
 * 
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-10-consolidate-pharmacy-orders.ts --apply
 * (Apply currently performs no writes until mapping is approved in this script)
 * Requires MONGODB_URI.
 */
import { connect, connection } from 'mongoose';

const DRY = !process.argv.includes('--apply');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nabdplus?replicaSet=rs0';
  await connect(uri);
  const db = connection.db;
  if (!db) throw new Error('no database connection');

  const names = new Set((await db.listCollections().toArray()).map((c: any) => c.name));
  const report: any = { dry_run: DRY, writes_performed: false };

  for (const c of ['pharmacy_orders', 'orders']) {
    if (!names.has(c)) {
      report[c] = { status: 'absent' };
      continue;
    }
    const byState = await db.collection(c).aggregate([
      { $group: { _id: '$state', n: { $sum: 1 } } },
      { $project: { state: '$_id', n: 1, _id: 0 } }
    ]).toArray().catch(() => []);
    const byStatus = await db.collection(c).aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
      { $project: { status: '$_id', n: 1, _id: 0 } }
    ]).toArray().catch(() => []);

    const sample = await db.collection(c).findOne({}, { projection: { _id: 0 } });
    const fields = sample ? Object.keys(sample) : [];

    report[c] = {
      docs: await db.collection(c).countDocuments(),
      by_state: byState,
      by_status: byStatus,
      field_count: fields.length,
      sample_fields: fields.slice(0, 30),
    };
  }

  // ID collision check
  if (report.pharmacy_orders?.docs && report.orders?.docs) {
    const srcIds = Array.from((await db.collection('pharmacy_orders').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const dstIds = Array.from((await db.collection('orders').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const srcSet = new Set(srcIds);
    const dstSet = new Set(dstIds);
    const collisions = srcIds.filter((id) => dstSet.has(id));
    report.id_collisions = collisions.length;
    report.collision_sample = collisions.slice(0, 5);
  }

  // Field overlap analysis
  if (report.pharmacy_orders?.sample_fields && report.orders?.sample_fields) {
    const poFields = Array.from(report.pharmacy_orders.sample_fields);
    const oFields = Array.from(report.orders.sample_fields);
    const poSet = new Set(poFields);
    const oSet = new Set(oFields);
    const common = poFields.filter((f) => oSet.has(f));
    const poOnly = poFields.filter((f) => !oSet.has(f));
    const oOnly = oFields.filter((f) => !poSet.has(f));
    report.field_overlap = {
      common: common.length,
      pharmacy_orders_only: poOnly.length,
      orders_only: oOnly.length,
      pharmacy_orders_only_sample: poOnly.slice(0, 20),
      orders_only_sample: oOnly.slice(0, 20),
    };
  }

  report.gate = 'COPY DISABLED: approve the field/state mapping on staging first. Re-run with --apply only after the mapping lands in this script.';
  console.log(JSON.stringify(report, null, 2));
  await connection.close();
}

main().catch((e) => { console.error(e); process.exit(1); });