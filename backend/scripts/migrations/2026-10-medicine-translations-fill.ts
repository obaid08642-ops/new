/**
 * Medicine name translations (2026-10-24, issue 1844). DRY RUN BY DEFAULT. NOT RUN ON PRODUCTION: needs owner approval.
 *
 * Source: data/catalogue-input-01/medicine-translations-2026-10-24.csv (machine-proposed, needs native review). The rules
 * (what may change, never-overwrite, the hash check, backup and rollback) are in src/modules/medicines/medicine-translation-fill.ts.
 *
 *   Dry run (default, reads an export, never a database):
 *     npx ts-node --transpile-only scripts/migrations/2026-10-medicine-translations-fill.ts --export=<medicines.json>
 *     It prints the file's SHA-256: that is the confirmation the production apply needs.
 *
 *   Production apply (owner approval first):
 *     MONGODB_URI=... DB_NAME=... CONFIRM_MEDICINE_TRANSLATIONS=<sha256 from the dry run> \
 *       npx ts-node --transpile-only scripts/migrations/2026-10-medicine-translations-fill.ts --production --apply [--backup=<file>]
 *     The backup (default: next to the CSV) is written before any change. Without --production, --apply is refused.
 *
 *   Rollback (owner approval first):
 *     MONGODB_URI=... DB_NAME=... CONFIRM_MEDICINE_TRANSLATIONS=<csv_sha256 from the backup> \
 *       npx ts-node --transpile-only scripts/migrations/2026-10-medicine-translations-fill.ts --production --rollback=<backup.json>
 *     A field is restored only while it still holds the value this migration wrote.
 *
 *   Test database only (--test-seed --apply): copies the English values into the six locales of the seeded test medicines.
 *     Refused for any DB_NAME without "test" or "live".
 */
import * as fs from 'fs';
import * as path from 'path';
import { connect, connection } from 'mongoose';
import {
  Backup, buildBackup, checkConfirmation, csvSha256, FillChange, loadTranslations, planFill,
} from '../../src/modules/medicines/medicine-translation-fill';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const APPLY = process.argv.includes('--apply');
const PRODUCTION = process.argv.includes('--production');
const TEST_SEED = process.argv.includes('--test-seed');
const CSV = path.join(__dirname, '../../../data/catalogue-input-01/medicine-translations-2026-10-24.csv');
const URI = () => process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';

function requireDbName(): string {
  const dbName = process.env.DB_NAME || '';
  if (!dbName) throw new Error('DB_NAME is required');
  return dbName;
}

/** A value of `null` in a change means the field was absent: the filter then accepts absent or empty. */
function beforeFilter(change: FillChange): unknown {
  return change.before === null ? { $in: [null, ''] } : change.before;
}

async function readRows(): Promise<any[]> {
  return connection.collection('medicines').find({ is_deleted: { $ne: true } }, { projection: { _id: 0 } }).toArray();
}

async function main() {
  const csvText = fs.readFileSync(CSV, 'utf8');
  const map = loadTranslations(csvText);
  const sha = csvSha256(csvText);

  if (TEST_SEED) {
    const dbName = requireDbName();
    if (!/test|live/i.test(dbName)) throw new Error(`--test-seed refused: DB_NAME "${dbName}" is not a test database`);
    if (!APPLY) throw new Error('--test-seed writes: add --apply');
    if (process.env.CONFIRM_MEDICINE_TRANSLATIONS !== 'yes') throw new Error('set CONFIRM_MEDICINE_TRANSLATIONS=yes');
    await connect(URI(), { dbName });
    const rows = await readRows();
    let n = 0;
    for (const r of rows) {
      const set: Record<string, string> = {};
      for (const loc of ['ur', 'hi', 'bn', 'tl']) {
        if (!String(r.translations?.[loc]?.name || '').trim()) set[`translations.${loc}.name`] = String(r.name_en || r.name_ar || '');
      }
      if (Object.keys(set).length) { await connection.collection('medicines').updateOne({ id: r.id }, { $set: set }); n += 1; }
    }
    console.log(JSON.stringify({ mode: 'test-seed', db: dbName, rows_updated: n }));
    await connection.close();
    return;
  }

  if (process.argv.some((a) => a.startsWith('--rollback='))) {
    if (!PRODUCTION) throw new Error('--rollback needs --production');
    const backup: Backup = JSON.parse(fs.readFileSync(arg('rollback')!, 'utf8'));
    if (process.env.CONFIRM_MEDICINE_TRANSLATIONS !== backup.csv_sha256) throw new Error(`CONFIRM_MEDICINE_TRANSLATIONS must be the backup's csv_sha256 (${backup.csv_sha256})`);
    const dbName = requireDbName();
    await connect(URI(), { dbName });
    let restored = 0; let skipped = 0;
    for (const c of backup.changes) {
      const filter = { id: c.id, [c.path]: c.after };
      const update = c.before === null ? { $unset: { [c.path]: '' } } : { $set: { [c.path]: c.before } };
      const res = await connection.collection('medicines').updateOne(filter, update);
      if (res.modifiedCount) restored += 1; else skipped += 1;
    }
    console.log(JSON.stringify({ mode: 'rollback', db: dbName, restored, skipped_changed_since: skipped }));
    await connection.close();
    return;
  }

  const exportPath = arg('export');
  if (!APPLY) {
    if (!exportPath) throw new Error('the dry run needs --export=<medicines.json> (a read-only production export)');
    const rows = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const changes = planFill(rows, map);
    const perLocale: Record<string, number> = {};
    for (const c of changes) perLocale[`${c.locale}.${c.field}`] = (perLocale[`${c.locale}.${c.field}`] || 0) + 1;
    console.log(JSON.stringify({ mode: 'dry-run', csv_sha256: sha, export: exportPath, medicines: rows.length, planned_changes: changes.length, per_field: perLocale }, null, 1));
    console.log(`To apply after owner approval, set CONFIRM_MEDICINE_TRANSLATIONS=${sha} and run with --production --apply.`);
    return;
  }

  if (!PRODUCTION) throw new Error('--apply without --production is refused: the production apply needs --production and CONFIRM_MEDICINE_TRANSLATIONS=<sha256>');
  if (!checkConfirmation(csvText, process.env.CONFIRM_MEDICINE_TRANSLATIONS)) {
    throw new Error(`CONFIRM_MEDICINE_TRANSLATIONS must be the reviewed file's sha256: ${sha}`);
  }
  const dbName = requireDbName();
  await connect(URI(), { dbName });
  const rows = await readRows();
  const changes = planFill(rows, map);
  // The backup is written before any change: a rollback needs it.
  const backupPath = arg('backup') || path.join(path.dirname(CSV), `medicine-translations-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(buildBackup(changes, sha, dbName), null, 1), 'utf8');
  let applied = 0; let skipped = 0;
  for (const c of changes) {
    const res = await connection.collection('medicines').updateOne({ id: c.id, [c.path]: beforeFilter(c) }, { $set: { [c.path]: c.after } });
    if (res.modifiedCount) applied += 1; else skipped += 1;
  }
  console.log(JSON.stringify({ mode: 'production-apply', db: dbName, backup: backupPath, planned: changes.length, applied, skipped_changed_since_dry_run: skipped }));
  await connection.close();
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
