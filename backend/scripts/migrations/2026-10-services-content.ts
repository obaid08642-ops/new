/**
 * #1556 owner decision F (2026-10-16): write and PUBLISH the description, preparation, purpose and turnaround of every
 * lab test/package, scan and nursing service in six languages, the six-language names of every list (specialties
 * included), and add the missing common items. Content: src/modules/catalogs/content/services-content.v1.json
 * (versioned; `fil` is stored in the `_tl` fields like the rest of the backend).
 *
 * For every content item the matching rows (code, id or English name; duplicates of one service all match) get:
 *   description_<lang>, preparation_<lang>, name_<ur|hi|bn|tl>, fasting_required/fasting_hours (lab, scan),
 *   and `content` = { version, status: 'published', medical_review_status: 'approved', post_launch_review: 'pending',
 *   translations: { <lang>: { description, purpose, preparation[], turnaround } } }.
 * A row's visibility (active, public_eligibility, its own medical_review_status) is not changed.
 * Missing items (`add`) are inserted with their published content but `public_eligibility: false` and
 * `needs_price: true`: the catalogue has no reference price for them and none is invented; they list once an admin
 * sets the price. Missing specialties are inserted active.
 *
 * - Dry-run default (prints what would change); `--apply` writes. Idempotent: rows already at this content version
 *   are skipped (`--force` rewrites them).
 * - NODE_ENV=production is refused unless CONFIRM_SERVICES_CONTENT=yes.
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-services-content.ts [--apply]
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { connect, connection, mongo } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
export const CONTENT_FILE = path.join(__dirname, '../../src/modules/catalogs/content/services-content.v1.json');

type Lang = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'fil';
type Text = Record<Lang, string>;
type Item = {
  match: { codes: string[]; names_en: string[] };
  description: Text;
  purpose: Text;
  preparation: Record<Lang, string[]>;
  turnaround: Text;
  fasting_required: boolean;
  fasting_hours: number;
  turnaround_hours?: number;
  add?: Record<string, unknown>;
};
type Content = {
  version: number;
  languages: Lang[];
  lab_services: Item[];
  radiology_services: Item[];
  nursing_services: Item[];
  specialties: Array<{ code: string; names: Text; add?: boolean }>;
};

/** Database field suffix of a content language. */
export const suffix = (l: Lang) => (l === 'fil' ? 'tl' : l);
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function matches(row: Record<string, unknown>, item: Item): boolean {
  const codes = new Set(item.match.codes);
  for (const k of ['short_code', 'test_code', 'code', 'id']) if (typeof row[k] === 'string' && codes.has(row[k] as string)) return true;
  const names = new Set(item.match.names_en.map(norm));
  return names.has(norm(row.name_en));
}

/** The fields the content writes on a catalogue row. */
export function contentFields(c: Content, item: Item, kind: string): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  const translations: Record<string, unknown> = {};
  for (const l of c.languages) {
    const s = suffix(l);
    set[`description_${s}`] = item.description[l];
    set[`preparation_${s}`] = item.preparation[l];
    translations[s] = { description: item.description[l], purpose: item.purpose[l], preparation: item.preparation[l], turnaround: item.turnaround[l] };
  }
  if (kind !== 'nursing_services') {
    set.fasting_required = item.fasting_required;
    set.fasting_hours = item.fasting_hours;
  }
  if (item.turnaround_hours) set.turnaround_hours = item.turnaround_hours;
  set.content = { version: c.version, status: 'published', medical_review_status: 'approved', post_launch_review: 'pending', translations };
  return set;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_SERVICES_CONTENT !== 'yes') {
    throw new Error('refused: NODE_ENV=production needs CONFIRM_SERVICES_CONTENT=yes');
  }
  const c: Content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const report: Record<string, unknown> = { version: c.version };
  for (const kind of ['lab_services', 'radiology_services', 'nursing_services'] as const) {
    const col = db.collection(kind);
    const rows = await col.find({}).toArray();
    const r = { rows: rows.length, written: 0, current: 0, added: [] as string[], without_content: [] as string[] };
    for (const item of c[kind]) {
      const hits = rows.filter((row) => matches(row, item));
      if (!hits.length && item.add) {
        const fields = contentFields(c, item, kind);
        const id = String(item.add.short_code || item.add.code || randomUUID());
        r.added.push(String(item.add.name_en));
        if (APPLY) {
          await col.updateOne(
            { $or: [{ short_code: id }, { code: id }, { id }] },
            { $setOnInsert: { id, ...item.add, ...fields, active: true, is_deleted: false, public_eligibility: false, needs_price: true, medical_review_status: 'approved', provenance: `services-content.v${c.version}` } },
            { upsert: true },
          );
        }
        continue;
      }
      for (const row of hits) {
        const at = (row.content as { version?: number } | undefined)?.version || 0;
        if (at >= c.version && !FORCE) {
          r.current++;
          continue;
        }
        r.written++;
        if (APPLY) await col.updateOne({ _id: row._id as mongo.ObjectId }, { $set: contentFields(c, item, kind) });
      }
    }
    r.without_content = rows.filter((row) => !c[kind].some((i) => matches(row, i))).map((row) => String(row.name_en ?? row.id));
    report[kind] = r;
  }
  const spec = db.collection('specialties');
  const srows = await spec.find({}).toArray();
  const s = { rows: srows.length, written: 0, added: [] as string[], without_names: [] as string[] };
  let sort = srows.reduce((m, x) => Math.max(m, Number(x.sort) || 0), 0);
  for (const it of c.specialties) {
    const names: Record<string, string> = {};
    for (const l of ['ur', 'hi', 'bn', 'fil'] as const) names[`name_${suffix(l)}`] = it.names[l];
    const hits = srows.filter((x) => x.code === it.code || x.id === `spec-${it.code}`);
    if (!hits.length && it.add) {
      s.added.push(it.names.en);
      if (APPLY) {
        await spec.updateOne({ code: it.code }, { $setOnInsert: { id: `spec-${it.code}`, code: it.code, name_ar: it.names.ar, name_en: it.names.en, ...names, sort: ++sort, active: true, provenance: `services-content.v${c.version}` } }, { upsert: true });
      }
      continue;
    }
    for (const x of hits) {
      // A stored English name that is only the code (e.g. "cardiology") becomes the display name.
      const set: Record<string, unknown> = { ...names };
      if (!x.name_en || x.name_en === x.code) set.name_en = it.names.en;
      s.written++;
      if (APPLY) await spec.updateOne({ _id: x._id }, { $set: set });
    }
  }
  s.without_names = srows.filter((x) => !c.specialties.some((i) => i.code === x.code)).map((x) => String(x.code ?? x.id));
  report.specialties = s;
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report }));
}

if (require.main === module) {
  main()
    .then(() => connection.close())
    .catch(async (e) => {
      console.error(e?.message || e);
      await connection.close().catch(() => undefined);
      process.exit(1);
    });
}
