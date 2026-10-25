/**
 * The production catalogue apply (owner-approved, 2026-10-25): the pure rules and the guarded writes behind
 * `src/scripts/catalogue-apply.ts` and the server-ops task `tools/ops/tasks/90-catalogue-apply.sh`.
 *
 * Every step plans a list of CHANGES; nothing is written while planning. The plan has a SHA-256 (the change list plus the
 * SHA-256 of every input file) and the apply refuses unless it is given exactly that hash, so only what the dry run showed is
 * applied. A change is either
 *   set     one field of one document, written only while the field still holds the value the plan saw (compare-and-set), or
 *   insert  one new document.
 * The backup holds the before-image of every set and the key of every insert, so a rollback restores exactly those.
 */
import { createHash } from 'crypto';
import { gunzipSync, gzipSync } from 'zlib';
import { Types } from 'mongoose';

export type SetChange = { kind: 'set'; step: string; collection: string; key: Record<string, unknown>; path: string; before: unknown; after: unknown };
export type InsertChange = { kind: 'insert'; step: string; collection: string; doc: Record<string, unknown> };
export type Change = SetChange | InsertChange;

/** The slice of the MongoDB driver the apply uses (so it can be tested with a fake or the in-memory server). */
export interface CollectionLike {
  find(filter: Record<string, unknown>, options?: { projection?: Record<string, unknown> }): { toArray(): Promise<any[]> };
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount?: number }>;
  insertOne(doc: Record<string, unknown>): Promise<unknown>;
  deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount?: number }>;
  bulkWrite(ops: Array<Record<string, unknown>>, options?: { ordered?: boolean }): Promise<{ modifiedCount?: number }>;
  countDocuments(filter?: Record<string, unknown>): Promise<number>;
}
export interface DbLike { collection(name: string): CollectionLike }

// ---------------------------------------------------------------------------
// hashing and (de)serialisation
// ---------------------------------------------------------------------------

export const sha256 = (text: string | Buffer): string => createHash('sha256').update(text).digest('hex');

/** JSON with sorted keys, ObjectIds as {$oid}: the same value always gives the same text. */
export function stable(value: unknown): string {
  const walk = (v: any): any => {
    if (v instanceof Types.ObjectId) return { $oid: v.toHexString() };
    if (v instanceof Date) return { $date: v.toISOString() };
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, walk(v[k])]));
    return v === undefined ? null : v;
  };
  return JSON.stringify(walk(value));
}

export function revive(value: any): any {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    if (typeof value.$oid === 'string' && Object.keys(value).length === 1) return new Types.ObjectId(value.$oid);
    if (typeof value.$date === 'string' && Object.keys(value).length === 1) return new Date(value.$date);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, revive(v)]));
  }
  return value;
}

/** The hash the apply must be given: the changes (order-independent) and the SHA-256 of every input file. */
export function planSha(changes: Change[], inputs: Record<string, string>): string {
  const lines = changes.map((c) => stable(c)).sort();
  return sha256(stable({ inputs, changes: lines }));
}

export function summarize(changes: Change[]): Record<string, { set: number; insert: number }> {
  const out: Record<string, { set: number; insert: number }> = {};
  for (const c of changes) {
    const row = (out[c.step] ||= { set: 0, insert: 0 });
    row[c.kind] += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// writes
// ---------------------------------------------------------------------------

/** An absent or empty field is written as `null` in the plan; the guard then accepts absent, null or empty. */
const beforeGuard = (before: unknown) => (before === null || before === undefined ? { $in: [null, ''] } : before);

const BATCH = 1000;

/** Runs the compare-and-set updates in batches of 1000 (one round trip each); returns how many modified a document. */
async function runUpdates(db: DbLike, collection: string, ops: Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>): Promise<{ modified: number; total: number }> {
  let modified = 0;
  for (let i = 0; i < ops.length; i += BATCH) {
    const slice = ops.slice(i, i + BATCH);
    const res = await db.collection(collection).bulkWrite(slice.map((o) => ({ updateOne: { filter: o.filter, update: o.update } })), { ordered: false });
    modified += res.modifiedCount ?? 0;
  }
  return { modified, total: ops.length };
}

export async function applyChanges(db: DbLike, changes: Change[], now: Date = new Date()): Promise<{ applied: number; skipped_changed_since_plan: number; inserted: number }> {
  let applied = 0; let skipped = 0; let inserted = 0;
  const sets = new Map<string, Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>>();
  for (const c of changes) {
    if (c.kind === 'insert') {
      const exists = await db.collection(c.collection).countDocuments({ code: c.doc.code });
      if (exists) { skipped += 1; continue; }
      await db.collection(c.collection).insertOne({ ...c.doc, createdAt: now, updatedAt: now });
      inserted += 1;
    } else {
      const list = sets.get(c.collection) ?? [];
      list.push({ filter: { ...c.key, [c.path]: beforeGuard(c.before) }, update: { $set: { [c.path]: c.after } } });
      sets.set(c.collection, list);
    }
  }
  for (const [collection, ops] of sets) {
    const r = await runUpdates(db, collection, ops);
    applied += r.modified; skipped += r.total - r.modified;
  }
  return { applied, skipped_changed_since_plan: skipped, inserted };
}

/**
 * Undo: a field goes back to its before-image only while it still holds what the apply wrote; an inserted document is deleted.
 * A nested field that did not exist (`translations.hi.name`) leaves its parents behind as {}: the ones that are empty now are dropped.
 */
export async function rollbackChanges(db: DbLike, changes: Change[]): Promise<{ restored: number; skipped_changed_since: number; deleted: number }> {
  let restored = 0; let skipped = 0; let deleted = 0;
  const sets = new Map<string, Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>>();
  const parents = new Map<string, Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>>();
  for (const c of [...changes].reverse()) {
    if (c.kind === 'insert') {
      const res = await db.collection(c.collection).deleteOne({ code: c.doc.code, source: c.doc.source });
      if (res.deletedCount) deleted += 1; else skipped += 1;
      continue;
    }
    const absent = c.before === null || c.before === undefined;
    const list = sets.get(c.collection) ?? [];
    list.push({ filter: { ...c.key, [c.path]: c.after }, update: absent ? { $unset: { [c.path]: '' } } : { $set: { [c.path]: c.before } } });
    sets.set(c.collection, list);
    if (absent) {
      const parts = c.path.split('.');
      const plist = parents.get(c.collection) ?? [];
      for (let i = parts.length - 1; i >= 1; i--) {
        const parent = parts.slice(0, i).join('.');
        plist.push({ filter: { ...c.key, [parent]: {} }, update: { $unset: { [parent]: '' } } });
      }
      parents.set(c.collection, plist);
    }
  }
  for (const [collection, ops] of sets) {
    const r = await runUpdates(db, collection, ops);
    restored += r.modified; skipped += r.total - r.modified;
  }
  for (const [collection, ops] of parents) await runUpdates(db, collection, ops);
  return { restored, skipped_changed_since: skipped, deleted };
}

// ---------------------------------------------------------------------------
// backup file: gzip(JSON), with its own SHA-256 reported by the caller
// ---------------------------------------------------------------------------

export interface Backup { meta: { created_at: string; db: string; plan_sha: string; inputs: Record<string, string>; counts: Record<string, number> }; changes: Change[] }

export function encodeBackup(b: Backup): Buffer {
  return gzipSync(Buffer.from(stable(b), 'utf8'));
}
export function decodeBackup(buf: Buffer): Backup {
  return revive(JSON.parse(gunzipSync(buf).toString('utf8'))) as Backup;
}

/** Document counts of the collections the plan touches: the verify step compares before and after. */
export async function countsOf(db: DbLike, collections: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const name of collections) out[name] = await db.collection(name).countDocuments({});
  return out;
}

export function expectedCounts(before: Record<string, number>, changes: Change[]): Record<string, number> {
  const out = { ...before };
  for (const c of changes) if (c.kind === 'insert') out[c.collection] = (out[c.collection] ?? 0) + 1;
  return out;
}
