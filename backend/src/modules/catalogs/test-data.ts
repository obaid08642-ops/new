/**
 * Test and seed records in production (owner decision 2026-10-28: "remove the test providers"). Production's public map held exactly three providers,
 * all test data. Two things live here, both pure over a database handle so they can be tested on an in-memory MongoDB:
 *
 *   findTestRecords  READ-ONLY. Names that look like test data (test, sandbox, demo, dummy, fake, lorem, Arabic اختبار/تجرب, keyboard mash) in the provider,
 *                    account, facility and catalogue collections, plus the ids it is told about, with what each provider record is linked to (counts per
 *                    collection). It returns ids, which pattern matched and counts: never a name, an e-mail, a phone or any other value of a record.
 *   planTestDataRemoval  the guarded removal as catalogue-apply changes (see catalogue-apply.core.ts): only the provider profiles whose ids the owner listed in the
 *                    reviewed file are touched, never a pattern. Their accounts, sessions (access is revoked) and everything that points at them are deleted
 *                    with a full before-image, so a rollback puts it all back. More than REMOVAL_CAP linked documents stops the plan.
 */
import type { Change, DbLike } from './catalogue-apply.core';
import { CATALOG_COLLECTIONS } from './catalog-collections';

export const TEST_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['test', /\btest(s|ing|er)?\b/i], ['sandbox', /sandbox/i], ['demo', /\bdemo\b/i], ['dummy', /dummy/i], ['fake', /\bfake\b/i], ['lorem', /lorem|ipsum/i],
  ['ar_test', /اختبار|تجرب|تجريب/],
];

/** Keyboard mash: a name whose letters are mostly a few repeated pairs ("لنبتبت", "مسينيزيزسزس"). A finder heuristic, a human decides. */
export function looksLikeMash(name: string): boolean {
  const letters = Array.from(String(name || '').replace(/[^\p{L}]/gu, ''));
  if (letters.length < 6) return false;
  if (new Set(letters).size / letters.length <= 0.5) return true;
  const grams = new Map<string, number[]>();
  for (let i = 0; i + 1 < letters.length; i++) { const g = letters[i] + letters[i + 1]; grams.set(g, [...(grams.get(g) ?? []), i]); }
  const covered = new Set<number>();
  for (const pos of grams.values()) if (pos.length >= 2) for (const p of pos) { covered.add(p); covered.add(p + 1); }
  return covered.size / letters.length >= 0.4;
}

export function matchedPatterns(texts: unknown[], mash = true): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    if (typeof t !== 'string' || !t.trim()) continue;
    for (const [name, re] of TEST_PATTERNS) if (re.test(t)) out.add(name);
    if (mash && looksLikeMash(t)) out.add('mash');
  }
  return [...out].sort();
}

/** Where a name can sit, by collection. `mash` only for the small provider collections (a product name is never judged by the heuristic). */
const NAME_COLLECTIONS: Array<{ name: string; fields: string[]; mash: boolean; idField: string }> = [
  { name: 'provider_profiles', fields: ['name_ar', 'name_en', 'display_name_ar', 'display_name_en', 'business_name', 'legal_name'], mash: true, idField: 'id' },
  { name: 'doctors', fields: ['name_ar', 'name_en', 'full_name'], mash: true, idField: 'id' },
  { name: 'facilities', fields: ['name_ar', 'name_en'], mash: true, idField: 'id' },
  { name: 'provider_accounts', fields: ['email'], mash: false, idField: 'id' },
  { name: 'users', fields: ['name', 'full_name', 'first_name', 'last_name', 'email'], mash: false, idField: 'id' },
  ...[CATALOG_COLLECTIONS.medicines, CATALOG_COLLECTIONS.lab_services, CATALOG_COLLECTIONS.radiology_services, CATALOG_COLLECTIONS.nursing_services, CATALOG_COLLECTIONS.specialties, CATALOG_COLLECTIONS.insurance_companies]
    .map((name) => ({ name: name as string, fields: ['name_ar', 'name_en'], mash: false, idField: 'id' })),
];

/** Fields that point at a provider (profile id, account id or login id) in other collections. */
export const PROVIDER_REFERENCE_FIELDS = [
  'provider_id', 'provider_account_id', 'account_id', 'provider_user_id', 'pharmacy_id', 'pharmacy_account_id', 'doctor_id', 'doctor_account_id', 'lab_id', 'lab_account_id',
  'center_id', 'center_account_id', 'facility_id', 'owner_account_id', 'seller_id', 'user_id',
];
/** Never scanned for links nor removed with a provider: the catalogue, the audit trail, the append-only logs, the system collections. */
const NEVER_LINKED = new Set<string>(['medicines', 'lab_services', 'radiology_services', 'nursing_services', 'specialties', 'insurance_companies', 'locations', 'audit_logs', 'provider_audit_logs', 'admin_audit_logs', 'migrations']);
const isLog = (n: string) => /(^|_)(audit|logs?|events?|metrics|outbox)(_|$)/.test(n);

export interface ScanDb extends DbLike { listCollectionNames(): Promise<string[]> }
/** The real driver handle, as the scan needs it. */
export function scanDb(db: unknown): ScanDb {
  const d = db as { collection: DbLike['collection']; listCollections: () => { toArray(): Promise<Array<{ name: string }>> } };
  return { collection: (n: string) => d.collection(n), listCollectionNames: async () => (await d.listCollections().toArray()).map((c) => c.name) };
}

export interface Candidate { collection: string; id: string; matched: string[]; type?: string }
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

export async function findTestRecords(db: ScanDb, extraIds: string[] = []): Promise<{ scanned: Record<string, number>; candidates: Candidate[]; links: Record<string, Record<string, number>> }> {
  const names = new Set(await db.listCollectionNames());
  const scanned: Record<string, number> = {};
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const add = (c: Candidate) => { const k = `${c.collection}|${c.id}`; if (!seen.has(k)) { seen.add(k); candidates.push(c); } };
  for (const spec of NAME_COLLECTIONS) {
    if (!names.has(spec.name)) continue;
    const coll = db.collection(spec.name);
    scanned[spec.name] = await coll.countDocuments({});
    const projection: Record<string, number> = { _id: 1, type: 1, provider_type: 1, role: 1, ...Object.fromEntries([spec.idField, ...spec.fields].map((f) => [f, 1])) };
    let rows: any[];
    if (spec.mash) rows = await coll.find({}, { projection }).toArray();
    else {
      // large collections: let the database narrow it down with the same words
      const words = TEST_PATTERNS.map(([, re]) => re.source).join('|');
      rows = await coll.find({ $or: spec.fields.map((f) => ({ [f]: { $regex: words, $options: 'i' } })) }, { projection }).toArray();
    }
    for (const r of rows) {
      const m = matchedPatterns(spec.fields.map((f) => r[f]), spec.mash);
      const id = str(r[spec.idField]) || String(r._id);
      if (m.length || extraIds.includes(id)) add({ collection: spec.name, id, matched: m.length ? m : ['listed'], type: str(r.type) || str(r.provider_type) || str(r.role) || undefined });
    }
  }
  for (const id of extraIds) {
    if (candidates.some((c) => c.id === id)) continue;
    const hit = await db.collection('provider_profiles').find({ id }, { projection: { _id: 1, id: 1, type: 1 } }).toArray();
    if (hit.length) add({ collection: 'provider_profiles', id, matched: ['listed'], type: str(hit[0].type) || undefined });
  }
  const links: Record<string, Record<string, number>> = {};
  for (const c of candidates.filter((x) => x.collection === 'provider_profiles' || x.collection === 'doctors' || x.collection === 'facilities')) {
    links[c.id] = await linkedCounts(db, await idsOf(db, c.id), names);
  }
  return { scanned, candidates, links };
}

/** All ids one provider answers to: its profile id, user id, account id, and the provider account / login whose id or user_id is one of them. */
export async function idsOf(db: DbLike, profileId: string): Promise<string[]> {
  const ids = new Set<string>([profileId]);
  const prof = await db.collection('provider_profiles').find({ id: profileId }, { projection: { id: 1, user_id: 1, account_id: 1 } }).toArray();
  for (const p of prof) for (const v of [p.id, p.user_id, p.account_id]) if (str(v)) ids.add(v);
  const accounts = await db.collection('provider_accounts').find({ $or: [{ id: { $in: [...ids] } }, { user_id: { $in: [...ids] } }] }, { projection: { id: 1, user_id: 1 } }).toArray();
  for (const a of accounts) for (const v of [a.id, a.user_id]) if (str(v)) ids.add(v);
  return [...ids];
}

const referenceFilter = (ids: string[]) => ({ $or: PROVIDER_REFERENCE_FIELDS.map((f) => ({ [f]: { $in: ids } })) });

export async function linkedCounts(db: ScanDb, ids: string[], names?: Set<string>): Promise<Record<string, number>> {
  const all = names ?? new Set(await db.listCollectionNames());
  const out: Record<string, number> = {};
  for (const n of all) {
    if (n.startsWith('system.') || NEVER_LINKED.has(n) || isLog(n)) continue;
    const c = await db.collection(n).countDocuments(referenceFilter(ids));
    if (c) out[n] = c;
  }
  return out;
}

export const REMOVAL_CAP = 500;
export interface TestRemovalReport { profiles_found: string[]; profiles_not_found: string[]; deletes: Record<string, number>; total: number }

/** Plan only: nothing is written. The caller applies it with the same plan hash, backup, verify and rollback as every other step. */
export async function planTestDataRemoval(db: ScanDb, profileIds: string[]): Promise<{ changes: Change[]; report: TestRemovalReport }> {
  const changes: Change[] = [];
  const report: TestRemovalReport = { profiles_found: [], profiles_not_found: [], deletes: {}, total: 0 };
  const names = new Set(await db.listCollectionNames());
  const taken = new Set<string>();
  const del = (collection: string, doc: any) => {
    const k = `${collection}|${String(doc._id)}`;
    if (taken.has(k)) return;
    taken.add(k);
    changes.push({ kind: 'delete', step: 'test_data', collection, key: { _id: doc._id }, doc });
    report.deletes[collection] = (report.deletes[collection] ?? 0) + 1; report.total += 1;
  };
  for (const pid of [...new Set(profileIds.map((x) => x.trim()).filter(Boolean))]) {
    const profiles = await db.collection('provider_profiles').find({ id: pid }, {}).toArray();
    if (!profiles.length) { report.profiles_not_found.push(pid); continue; }
    report.profiles_found.push(pid);
    const ids = await idsOf(db, pid);
    // dependants first (every collection but the catalogue, the audit trail and the logs), then the accounts, the logins, the profile last
    for (const n of names) {
      if (n.startsWith('system.') || NEVER_LINKED.has(n) || isLog(n) || n === 'provider_profiles' || n === 'provider_accounts' || n === 'users') continue;
      for (const d of await db.collection(n).find(referenceFilter(ids), {}).toArray()) del(n, d);
    }
    for (const d of await db.collection('provider_accounts').find({ $or: [{ id: { $in: ids } }, { user_id: { $in: ids } }] }, {}).toArray()) del('provider_accounts', d);
    if (names.has('users')) for (const d of await db.collection('users').find({ id: { $in: ids } }, {}).toArray()) del('users', d);
    for (const d of profiles) del('provider_profiles', d);
  }
  if (report.total > REMOVAL_CAP) throw new Error(`test-data removal would delete ${report.total} documents (cap ${REMOVAL_CAP}): list fewer ids or review the links first`);
  report.profiles_found.sort(); report.profiles_not_found.sort();
  return { changes, report };
}
