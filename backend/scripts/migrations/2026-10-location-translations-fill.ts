/**
 * Location names in Urdu, Hindi, Bengali and Filipino (2026-10-24, issue 1831). DRY RUN BY DEFAULT. NOT RUN ON PRODUCTION: needs owner approval.
 *
 * Source: src/modules/location/seeds/location-translations.data.ts (machine-proposed, needs native review): the country, the five regions
 * and 59 principal cities. The rules (fill only absent or empty fields, never overwrite, the confirmation hash, backup and rollback)
 * are in src/modules/location/location-translation-fill.ts. New databases get the names from the seed; this fills the rows that
 * already exist, because the seed only inserts.
 *
 *   Dry run (default, reads an export, never a database):
 *     npx ts-node --transpile-only scripts/migrations/2026-10-location-translations-fill.ts --export=<locations.json>
 *     (an export of the `locations` collection: a JSON array of rows with `code`). It prints the table's SHA-256: the confirmation
 *     the production apply needs.
 *
 *   Production apply (owner approval first):
 *     MONGODB_URI=... DB_NAME=... CONFIRM_LOCATION_TRANSLATIONS=<sha256 from the dry run> \
 *       npx ts-node --transpile-only scripts/migrations/2026-10-location-translations-fill.ts --production --apply [--backup=<file>]
 *     The backup (default: location-translations-backup-<sha>.json in the working directory) is written before any change.
 *     Without --production, --apply is refused.
 *
 *   Rollback (owner approval first):
 *     MONGODB_URI=... DB_NAME=... CONFIRM_LOCATION_TRANSLATIONS=<table_sha256 from the backup> \
 *       npx ts-node --transpile-only scripts/migrations/2026-10-location-translations-fill.ts --production --rollback=<backup.json>
 *     A field is unset only while it still holds the value this migration wrote.
 */
import * as fs from 'fs';
import { connect, connection } from 'mongoose';
import { LOCATION_TRANSLATIONS } from '../../src/modules/location/seeds/location-translations.data';
import {
  buildBackup, checkConfirmation, LOCATION_FIELDS, LocationBackup, LocationPlan, LocationRow, planLocationFill, rollbackUpdate, tableSha256,
} from '../../src/modules/location/location-translation-fill';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const APPLY = process.argv.includes('--apply');
const PRODUCTION = process.argv.includes('--production');
const URI = () => process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';

function report(plan: LocationPlan, sha: string) {
  const perField = Object.fromEntries(LOCATION_FIELDS.map((f) => [f, plan.changes.filter((c) => c.field === f).length]));
  console.log(JSON.stringify({ table_sha256: sha, entries: Object.keys(LOCATION_TRANSLATIONS).length, to_fill: plan.changes.length, per_field: perField, kept: plan.kept.length, missing_in_export: plan.missing }, null, 2));
}

async function connectProduction(): Promise<void> {
  const dbName = process.env.DB_NAME;
  if (!dbName) throw new Error('DB_NAME is required');
  await connect(URI(), { dbName });
}

async function main() {
  const sha = tableSha256(LOCATION_TRANSLATIONS);
  const rollbackFile = arg('rollback');

  if (rollbackFile) {
    if (!PRODUCTION) throw new Error('--rollback needs --production');
    const backup: LocationBackup = JSON.parse(fs.readFileSync(rollbackFile, 'utf8'));
    if (!checkConfirmation(process.env.CONFIRM_LOCATION_TRANSLATIONS, backup.table_sha256)) throw new Error('CONFIRM_LOCATION_TRANSLATIONS must be the table_sha256 of the backup');
    await connectProduction();
    let restored = 0;
    for (const change of backup.changes) {
      const { filter, update } = rollbackUpdate(change);
      const res = await connection.collection('locations').updateOne(filter, update);
      restored += res.modifiedCount;
    }
    console.log(JSON.stringify({ rolled_back: restored, of: backup.changes.length }));
    await connection.close();
    return;
  }

  if (APPLY) {
    if (!PRODUCTION) throw new Error('--apply is refused without --production (the dry run never writes)');
    if (!checkConfirmation(process.env.CONFIRM_LOCATION_TRANSLATIONS, sha)) throw new Error(`CONFIRM_LOCATION_TRANSLATIONS must be ${sha} (the dry run prints it)`);
    await connectProduction();
    const rows = (await connection.collection('locations').find({ code: { $in: Object.keys(LOCATION_TRANSLATIONS) } }, { projection: { _id: 0, code: 1, name_ur: 1, name_hi: 1, name_bn: 1, name_tl: 1 } }).toArray()) as unknown as LocationRow[];
    const plan = planLocationFill(rows, LOCATION_TRANSLATIONS);
    const backupFile = arg('backup') || `location-translations-backup-${sha.slice(0, 12)}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(buildBackup(plan, sha, new Date().toISOString()), null, 2));
    report(plan, sha);
    let written = 0;
    for (const change of plan.changes) {
      // the filter accepts only an absent or empty field, so a value written meanwhile is never overwritten
      const res = await connection.collection('locations').updateOne({ code: change.code, [change.field]: { $in: [null, ''] } }, { $set: { [change.field]: change.after } });
      written += res.modifiedCount;
    }
    console.log(JSON.stringify({ written, backup: backupFile }));
    await connection.close();
    return;
  }

  const exportFile = arg('export');
  if (!exportFile) throw new Error('dry run needs --export=<locations.json> (an export of the locations collection)');
  const rows = JSON.parse(fs.readFileSync(exportFile, 'utf8')) as LocationRow[];
  report(planLocationFill(rows, LOCATION_TRANSLATIONS), sha);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
