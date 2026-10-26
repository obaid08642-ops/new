/**
 * Production catalogue apply (owner-approved 2026-10-25). Runs INSIDE the backend container, driven by
 * `tools/ops/tasks/90-catalogue-apply.sh`; it uses the container's own MONGO_URL / DB_NAME and prints counts, hashes and
 * variable names only: never a URI, a key or a document.
 *
 *   plan      [--districts=<extract.json>] [--name-fixes=<approved.csv>]            dry run: counts per step and the plan's SHA-256
 *   apply     --expect=<plan sha> --backup=<file.json.gz> [same inputs]              backup first, then the guarded writes, then verify
 *   verify    [same inputs]                                                          a fresh plan must be empty
 *   rollback  --backup=<file.json.gz>                                                restore the before-images / delete the inserts
 *
 * Exit codes: 0 ok · 2 the plan differs from --expect (nothing written) · 3 verify failed after the writes (the task rolls back) · 1 error.
 * Steps: medicine translations (#1844, the packaged CSV), Arabic/English names of regions, cities and insurers, medicine-name hygiene
 * and the owner-approved name fixes (#1556), districts (the extract packaged in the image; `--districts=<file>` overrides it),
 * placeholder and duplicate cities (deleted after their references are re-pointed; the plan prints the reference counts).
 * The name-fixes file is optional and skipped when not given; so is the product-translations file (`--product-translations=<file>`, made by
 * scripts/translate-product-content.ts): missing product texts translated from the existing ones, written only into empty fields.
 */
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { mongoDirectConnection } from '../common/database/mongo-uri';
import {
  applyChanges, countsOf, decodeBackup, encodeBackup, expectedCounts, planSha, rollbackChanges, sha256, summarize,
  type Change, type DbLike,
} from '../modules/catalogs/catalogue-apply.core';
import { planDistricts, planMedicineNameHygiene, planMedicineTranslations, planNameFixes, planNamesArEn, planNumberedDistricts, planPlaceholderCities, planProductTranslations } from '../modules/catalogs/catalogue-apply.steps';
import { isTranslationFile } from '../modules/medicines/content-translation';

const TRANSLATIONS_CSV = path.join(__dirname, '../modules/medicines/data/medicine-translations-2026-10-24.csv');
/** The districts extract shipped in the image (nest-cli asset, like the CSV above). A `--districts=<file>` on the command line overrides it. */
export const PACKAGED_DISTRICTS = path.join(__dirname, '../modules/location/data/districts-extract.v1.json');
const TOUCHED = ['medicines', 'locations', 'insurance_companies'];

const arg = (argv: string[], name: string): string | undefined => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
/** Error text without anything that looks like a connection string. */
const scrub = (e: unknown): string => String((e as Error)?.message || e).replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://<hidden>').slice(0, 300);

export interface Planned { changes: Change[]; inputs: Record<string, string>; sha: string; report: Record<string, unknown> }

export async function computePlan(db: DbLike, argv: string[]): Promise<Planned> {
  const inputs: Record<string, string> = {};
  const changes: Change[] = [];
  const report: Record<string, unknown> = {};

  const csv = fs.readFileSync(TRANSLATIONS_CSV, 'utf8');
  inputs.medicine_translations_csv = sha256(csv);
  changes.push(...(await planMedicineTranslations(db, csv)));

  changes.push(...(await planNamesArEn(db)));

  const hygiene = await planMedicineNameHygiene(db);
  changes.push(...hygiene.changes);
  report.medicine_names = hygiene.report;

  const fixes = arg(argv, 'name-fixes');
  if (fixes) {
    const text = fs.readFileSync(fixes, 'utf8');
    inputs.name_fixes_csv = sha256(text);
    const planned = await planNameFixes(db, text);
    changes.push(...planned.changes);
    report.name_fixes = { approved: planned.approved, refused: planned.refused, already_applied_or_changed: planned.already_applied_or_changed };
  } else report.name_fixes = 'skipped: no approved file given';

  const override = arg(argv, 'districts');
  const districts = override ?? PACKAGED_DISTRICTS;
  const text = fs.readFileSync(districts, 'utf8');
  inputs.districts_extract = sha256(text);
  const planned = await planDistricts(db, JSON.parse(text));
  changes.push(...planned.changes);
  report.districts = { source: override ? 'host_file_override' : 'packaged', rejected_rows: planned.rejected, new_cities: planned.newCities, cities_with_new_rows: planned.perCity.filter((c) => c.new > 0).length, new_rows: planned.perCity.reduce((n, c) => n + c.new, 0), centroid_fills: planned.perCity.reduce((n, c) => n + c.centroid_fills, 0) };

  const placeholders = await planPlaceholderCities(db);
  changes.push(...placeholders.changes);
  report.placeholder_cities = placeholders.report;

  const numbered = await planNumberedDistricts(db);
  changes.push(...numbered.changes);
  report.numbered_districts = { ...numbered.report, cities: undefined, per_city: numbered.report.cities };

  const translationsPath = arg(argv, 'product-translations');
  if (translationsPath) {
    const text = fs.readFileSync(translationsPath, 'utf8');
    inputs.product_translations = sha256(text);
    const parsed: unknown = JSON.parse(text);
    if (!isTranslationFile(parsed)) throw new Error('--product-translations is not a valid translations file');
    const t = await planProductTranslations(db, parsed);
    changes.push(...t.changes);
    report.product_translations = t.report;
  } else report.product_translations = 'skipped: no translations file given';

  return { changes, inputs, sha: planSha(changes, inputs), report };
}

/**
 * Small pool (the backend, Mongo, Redis and Meilisearch share about 1 GB of free RAM), a bounded socket wait, writes retried by the
 * driver once, and a quick heartbeat so a dead socket is noticed between batches. The batch retry in the core covers what the driver does not.
 */
export const CONNECTION_OPTIONS = { maxPoolSize: 2, minPoolSize: 0, serverSelectionTimeoutMS: 30_000, socketTimeoutMS: 120_000, heartbeatFrequencyMS: 10_000, retryWrites: true } as const;

/** Its own connection (never the process-wide default), closed by the caller. */
async function connect(): Promise<{ db: DbLike; close: () => Promise<void> }> {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set in this container');
  const conn = await mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), ...CONNECTION_OPTIONS }).asPromise();
  return { db: conn.db as unknown as DbLike, close: () => conn.close() };
}

const out = (o: Record<string, unknown>) => console.log(JSON.stringify(o));

export async function main(argv: string[]): Promise<number> {
  const cmd = argv[0];
  let { db, close } = await connect();
  try {
    if (cmd === 'plan') {
      const p = await computePlan(db, argv);
      out({ cmd, plan_sha: p.sha, inputs: p.inputs, steps: summarize(p.changes), total_changes: p.changes.length, ...p.report });
      return 0;
    }
    if (cmd === 'verify') {
      const p = await computePlan(db, argv);
      out({ cmd, remaining_changes: p.changes.length, steps: summarize(p.changes), ok: p.changes.length === 0 });
      return p.changes.length === 0 ? 0 : 3;
    }
    if (cmd === 'apply') {
      const expect = arg(argv, 'expect');
      const backupFile = arg(argv, 'backup');
      if (!expect || !backupFile) throw new Error('apply needs --expect=<plan sha> and --backup=<file>');
      const p = await computePlan(db, argv);
      if (p.sha !== expect) { out({ cmd, ok: false, error: 'plan_changed', plan_sha: p.sha }); return 2; }
      const before = await countsOf(db, TOUCHED);
      const file = encodeBackup({ meta: { created_at: new Date().toISOString(), db: process.env.DB_NAME || 'nabd_nestjs', plan_sha: p.sha, inputs: p.inputs, counts: before }, changes: p.changes });
      fs.writeFileSync(backupFile, file, { mode: 0o600 });
      const readBack = decodeBackup(fs.readFileSync(backupFile));
      if (readBack.changes.length !== p.changes.length || readBack.meta.plan_sha !== p.sha) throw new Error('backup could not be read back');
      out({ cmd, step: 'backup', file_sha256: sha256(file), bytes: file.length, changes: p.changes.length });
      const written = await applyChanges(db, p.changes);
      // The verify runs on a fresh connection: the one that did the writes may be the one that dropped.
      await close().catch(() => undefined);
      ({ db, close } = await connect());
      const after = await countsOf(db, TOUCHED);
      const want = expectedCounts(before, p.changes);
      const again = await computePlan(db, argv);
      const countsOk = TOUCHED.every((c) => after[c] === want[c] || want[c] === undefined);
      // A retried batch may have been written by its first attempt, which makes `applied` short; then the proof is the verify (nothing left to change, counts as expected).
      const ok = again.changes.length === 0 && countsOk && (written.skipped_changed_since_plan === 0 || written.retried_batches > 0);
      out({ cmd, step: 'apply', ...written, remaining_changes: again.changes.length, counts_before: before, counts_after: after, counts_ok: countsOk, ok });
      return ok ? 0 : 3;
    }
    if (cmd === 'rollback') {
      const backupFile = arg(argv, 'backup');
      if (!backupFile) throw new Error('rollback needs --backup=<file>');
      const b = decodeBackup(fs.readFileSync(backupFile));
      const res = await rollbackChanges(db, b.changes);
      const counts = await countsOf(db, TOUCHED);
      out({ cmd, ...res, counts_after: counts, counts_expected: b.meta.counts, ok: TOUCHED.every((c) => counts[c] === b.meta.counts[c]) });
      return 0;
    }
    throw new Error('usage: catalogue-apply <plan|apply|verify|rollback>');
  } finally {
    await close().catch(() => undefined);
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code)).catch((e) => { console.error(`error: ${scrub(e)}`); process.exit(1); });
}
