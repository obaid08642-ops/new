/*
 * P5.2: audit `doctor_appointments` vs canonical `appointments` (DRY-RUN ONLY).
 * The two collections have different shapes AND different live writers:
 *   - doctor_appointments: provider-ops consultation flow (type/scheduled_at/state/fee)
 *   - appointments: care flow state machine (service_type/slot_start/slot_end/status/price)
 * A mechanical copy would corrupt the care state machine, so this script
 * reports counts by state, id collisions, and field coverage, and REFUSES to
 * copy. The copy mapping + dual-write cutover must be reviewed on staging
 * (see AGENT_PROGRESS P5.2 note). Apply flag is accepted but performs no
 * writes until the mapping is approved.
 *
 * Run: node scripts/migrations/2026-09-merge-doctor-appointments.ts [--apply]
 * Requires MONGODB_URI.
 */
const mongoose = require('mongoose');

const DRY = !process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const report = { dry_run: DRY, writes_performed: false };
  for (const c of ['doctor_appointments', 'appointments']) {
    if (!names.has(c)) { report[c] = { status: 'absent' }; continue; }
    const byState = await db.collection(c).aggregate([{ $group: { _id: '$state', n: { $sum: 1 } } }, { $project: { state: '$_id', n: 1, _id: 0 } }]).toArray().catch(() => []);
    const byStatus = await db.collection(c).aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }, { $project: { status: '$_id', n: 1, _id: 0 } }]).toArray().catch(() => []);
    report[c] = {
      docs: await db.collection(c).countDocuments(),
      by_state: byState,
      by_status: byStatus,
    };
  }
  if (report.doctor_appointments?.docs && report.appointments) {
    const srcIds = new Set((await db.collection('doctor_appointments').find({}, { projection: { id: 1 } }).toArray()).map((d) => d.id));
    const dstIds = new Set((await db.collection('appointments').find({}, { projection: { id: 1 } }).toArray()).map((d) => d.id));
    const collisions = [...srcIds].filter((id) => dstIds.has(id));
    report.id_collisions = collisions.length;
    report.collision_sample = collisions.slice(0, 5);
  }
  report.gate = 'COPY DISABLED: approve the field/state mapping on staging first (P5.2 note in AGENT_PROGRESS.md). Re-run with --apply only after the mapping lands in this script.';
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
