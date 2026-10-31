/**
 * The production catalogue apply (owner-approved, 2026-10-25): the pure rules and the guarded writes behind
 * `src/scripts/catalogue-apply.ts` and the server-ops task `tools/ops/tasks/90-catalogue-apply.sh`.
 *
 * Every step plans a list of CHANGES; nothing is written while planning. The plan has a SHA-256 (the change list plus the
 * SHA-256 of every input file) and the apply refuses unless it is given exactly that hash, so only what the dry run showed is
 * applied. A change is either
 *   set     one field of one document, written only while the field still holds the value the plan saw (compare-and-set), or
 *   insert  one new document, or
 *   delete  one document, only while it is still the one the plan saw (same _id), after every set (references are re-pointed first).
 * The backup holds the before-image of every set and the key of every insert, so a rollback restores exactly those.
 */
import { createHash } from 'crypto';
import { gunzipSync, gzipSync } from 'zlib';
import { Types } from 'mongoose';

export type SetChange = { kind: 'set'; step: string; collection: string; key: Record<string, unknown>; path: string; before: unknown; after: unknown };
export type InsertChange = { kind: 'insert'; step: string; collection: string; doc: Record<string, unknown> };
/** Owner-approved removal (2026-10-26): the whole before-image is in the plan, so the backup can put the document back. */
export type DeleteChange = { kind: 'delete'; step: string; collection: string; key: Record<string, unknown>; doc: Record<string, unknown> };
export type Change = SetChange | InsertChange | DeleteChange;

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

export function summarize(changes: Change[]): Record<string, { set: number; insert: number; delete: number }> {
  const out: Record<string, { set: number; insert: number; delete: number }> = {};
  for (const c of changes) {
    const row = (out[c.step] ||= { set: 0, insert: 0, delete: 0 });
    row[c.kind] += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// one write per field
// ---------------------------------------------------------------------------

/**
 * Which step's write stands when two steps change the same field of the same row. The marker of a merged-away duplicate (`is_deleted: true`,
 * `merged_into`) must beat the completion's `is_deleted: false` default; the earlier step in this list wins, a step not listed comes last.
 */
export const STEP_PRECEDENCE = ['radiology_catalogue', 'catalogue_duplicates', 'catalogue_hidden_delete', 'catalogue_prune', 'catalogue_completion', 'product_translations'];
const rank = (step: string): number => { const i = STEP_PRECEDENCE.indexOf(step); return i === -1 ? STEP_PRECEDENCE.length : i; };
const overlaps = (a: string, b: string): boolean => a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`);

export interface SelfConflictReport {
  /** Writes dropped because another write to the same field (or a parent / child path of it) stands: "winner_step>dropped_step collection.path" -> count. Paths only, never values. */
  by_pair: Record<string, number>;
  dropped: number;
  /** The same step planning the identical write twice (two losers filling one keeper field with the same value). */
  identical_collapsed: number;
  /** Writes planned as a chain on one field (the second one's before-image is the first one's result): merged into one write, first before to last after. */
  chained: number;
}

/**
 * The apply runs the sets of a collection in one unordered bulk write, each guarded by the value the plan saw. Two sets on the same field that both
 * carry the SAME before-image (every step plans from the database as it is) race: whichever lands second finds the field changed and is skipped, the
 * apply counts it as "changed since the plan" and fails its own verify, and which one stands depends on timing. The plan therefore carries one set
 * per field:
 *  - a chain (the second write's before is the first write's after: the districts step plans this on purpose) is merged into one write;
 *  - otherwise the step that comes first in STEP_PRECEDENCE wins, inside one step the earlier change wins, and the rest are dropped and reported
 *    by step pair and path. A set on a parent path (`translations`) and one on a child (`translations.hi.name`) count as the same field.
 */
export function resolveSelfConflicts(changes: Change[]): { changes: Change[]; report: SelfConflictReport } {
  const report: SelfConflictReport = { by_pair: {}, dropped: 0, identical_collapsed: 0, chained: 0 };
  const rowOf = (c: SetChange) => `${c.collection}|${stable(c.key)}`;   // the whole key: some collections are keyed by code + type, not _id
  // 1. chains, in plan order: same row, same path, before == the previous write's after
  const out: Change[] = [];
  const lastOf = new Map<string, number>();   // row|path -> index in out
  for (const c of changes) {
    if (c.kind !== 'set') { out.push(c); continue; }
    const k = `${rowOf(c)}|${c.path}`;
    const at = lastOf.get(k);
    const prev = at === undefined ? undefined : (out[at] as SetChange);
    if (prev && stable(prev.after) === stable(c.before) && stable(prev.before) !== stable(c.before)) {
      out[at as number] = { ...prev, after: c.after };
      report.chained += 1;
      continue;
    }
    lastOf.set(k, out.length);
    out.push(c);
  }
  // 2. conflicts: same row, same or overlapping path, same before-image
  const byRow = new Map<string, Array<{ i: number; c: SetChange }>>();
  out.forEach((c, i) => { if (c.kind === 'set') { const k = rowOf(c); byRow.set(k, [...(byRow.get(k) ?? []), { i, c }]); } });
  const drop = new Set<number>();
  for (const rows of byRow.values()) {
    if (rows.length < 2) continue;
    const order = [...rows].sort((a, b) => rank(a.c.step) - rank(b.c.step) || a.i - b.i);
    const kept: typeof rows = [];
    for (const r of order) {
      const winner = kept.find((k) => overlaps(k.c.path, r.c.path));
      if (!winner) { kept.push(r); continue; }
      drop.add(r.i);
      if (winner.c.step === r.c.step && winner.c.path === r.c.path && stable(winner.c.after) === stable(r.c.after) && stable(winner.c.before) === stable(r.c.before)) { report.identical_collapsed += 1; continue; }
      const pair = `${winner.c.step}>${r.c.step} ${r.c.collection}.${r.c.path === winner.c.path ? r.c.path : `${winner.c.path}~${r.c.path}`}`;
      report.by_pair[pair] = (report.by_pair[pair] ?? 0) + 1;
      report.dropped += 1;
    }
  }
  const changed = drop.size > 0 || report.chained > 0;
  return { changes: changed ? out.filter((_, i) => !drop.has(i)) : changes, report };
}

/** One short line per collection: rows touched, writes by kind, and the deletions by step (their reason). */
export function collectionLines(changes: Change[]): string[] {
  const by: Record<string, { set: number; insert: number; delete: number; reasons: Record<string, number> }> = {};
  for (const c of changes) {
    const row = (by[c.collection] ||= { set: 0, insert: 0, delete: 0, reasons: {} });
    row[c.kind] += 1;
    if (c.kind === 'delete') row.reasons[c.step] = (row.reasons[c.step] || 0) + 1;
  }
  return Object.keys(by).sort().map((k) => {
    const r = by[k];
    const why = Object.entries(r.reasons).map(([step, n]) => `${step}=${n}`).join(',');
    return `${k}: rows=${r.set + r.insert + r.delete} set=${r.set} insert=${r.insert} delete=${r.delete}${why ? ` (${why})` : ''}`;
  });
}

// ---------------------------------------------------------------------------
// writes
// ---------------------------------------------------------------------------

/** An absent or empty field is written as `null` in the plan; the guard then accepts absent, null or empty. */
const beforeGuard = (before: unknown) => (before === null || before === undefined ? { $in: [null, ''] } : before);

/** Small batches: a dropped connection loses at most this many updates, and the host (about 1 GB free) is never asked for one long write. */
export const BATCH = 100;
const RETRY_ATTEMPTS = 6;
const RETRY_BASE_MS = 500;

/** A network failure that a retry can cure: the driver's network/selection errors, or a closed/reset socket by message. */
export function isTransientMongoError(e: unknown): boolean {
  const err = e as { name?: string; message?: string; code?: string; errorLabels?: string[]; hasErrorLabel?: (l: string) => boolean } | null;
  if (!err) return false;
  if (err.name === 'MongoNetworkError' || err.name === 'MongoNetworkTimeoutError' || err.name === 'MongoServerSelectionError' || err.name === 'MongoNotConnectedError') return true;
  if (err.hasErrorLabel?.('RetryableWriteError') || err.errorLabels?.includes('RetryableWriteError') || err.errorLabels?.includes('TransientTransactionError')) return true;
  return /\b(closed|ECONNRESET|EPIPE|ETIMEDOUT|socket|topology was destroyed|not connected)\b/i.test(`${err.code ?? ''} ${err.message ?? ''}`);
}

export interface RetryStats { retried_batches: number }

/**
 * Runs `fn` again after a transient network error (up to 6 attempts, 0.5 s doubling). `fn` receives the attempt number (1-based).
 * Every write here is guarded (compare-and-set, or insert-if-absent), so running a batch twice cannot apply anything twice.
 */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, stats?: RetryStats, sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt >= RETRY_ATTEMPTS || !isTransientMongoError(e)) throw e;
      if (stats) stats.retried_batches += 1;
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
}

/** Runs the compare-and-set updates in batches of 100 (one round trip each, retried on a dropped connection); returns how many modified a document. */
async function runUpdates(db: DbLike, collection: string, ops: Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>, stats?: RetryStats): Promise<{ modified: number; total: number }> {
  let modified = 0;
  for (let i = 0; i < ops.length; i += BATCH) {
    const slice = ops.slice(i, i + BATCH);
    const res = await withRetry(() => db.collection(collection).bulkWrite(slice.map((o) => ({ updateOne: { filter: o.filter, update: o.update } })), { ordered: false }), stats);
    // After a retry the first attempt may have written before the connection dropped, so this count can be short; the verify step is the proof.
    modified += res.modifiedCount ?? 0;
  }
  return { modified, total: ops.length };
}

export async function applyChanges(db: DbLike, changes: Change[], now: Date = new Date()): Promise<{ applied: number; skipped_changed_since_plan: number; inserted: number; deleted: number; retried_batches: number }> {
  const stats: RetryStats = { retried_batches: 0 };
  let applied = 0; let skipped = 0; let inserted = 0; let deleted = 0;
  const removals: DeleteChange[] = [];
  const sets = new Map<string, Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>>();
  for (const c of changes) {
    if (c.kind === 'insert') {
      // On a retry, a document with this code may be the one the dropped first attempt wrote: that counts as inserted.
      const wrote = await withRetry(async (attempt) => {
        const exists = await db.collection(c.collection).countDocuments({ code: c.doc.code });
        if (exists) return attempt > 1;
        await db.collection(c.collection).insertOne({ ...c.doc, createdAt: now, updatedAt: now });
        return true;
      }, stats);
      if (wrote) inserted += 1; else skipped += 1;
    } else if (c.kind === 'delete') {
      removals.push(c);
    } else {
      const list = sets.get(c.collection) ?? [];
      list.push({ filter: { ...c.key, [c.path]: beforeGuard(c.before) }, update: { $set: { [c.path]: c.after } } });
      sets.set(c.collection, list);
    }
  }
  for (const [collection, ops] of sets) {
    const r = await runUpdates(db, collection, ops, stats);
    applied += r.modified; skipped += r.total - r.modified;
  }
  // deletes last: the references were re-pointed above. A document that is no longer the one the plan saw (other _id) is left alone.
  for (const c of removals) {
    const res = await withRetry(() => db.collection(c.collection).deleteOne({ ...c.key, _id: c.doc._id }), stats);
    if (res.deletedCount) deleted += 1; else skipped += 1;
  }
  return { applied, skipped_changed_since_plan: skipped, inserted, deleted, retried_batches: stats.retried_batches };
}

/**
 * Undo: a field goes back to its before-image only while it still holds what the apply wrote; an inserted document is deleted.
 * A nested field that did not exist (`translations.hi.name`) leaves its parents behind as {}: the ones that are empty now are dropped.
 */
export async function rollbackChanges(db: DbLike, changes: Change[]): Promise<{ restored: number; skipped_changed_since: number; deleted: number; retried_batches: number }> {
  const stats: RetryStats = { retried_batches: 0 };
  let restored = 0; let skipped = 0; let deleted = 0;
  const sets = new Map<string, Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>>();
  const parents = new Map<string, Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>>();
  for (const c of [...changes].reverse()) {
    if (c.kind === 'delete') {
      // put the document back (with its _id) unless something with that key exists again
      const back = await withRetry(async () => {
        if (await db.collection(c.collection).countDocuments(c.key)) return false;
        await db.collection(c.collection).insertOne(c.doc);
        return true;
      }, stats);
      if (back) restored += 1; else skipped += 1;
      continue;
    }
    if (c.kind === 'insert') {
      const res = await withRetry(() => db.collection(c.collection).deleteOne({ code: c.doc.code, source: c.doc.source }), stats);
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
    const r = await runUpdates(db, collection, ops, stats);
    restored += r.modified; skipped += r.total - r.modified;
  }
  for (const [collection, ops] of parents) await runUpdates(db, collection, ops, stats);
  return { restored, skipped_changed_since: skipped, deleted, retried_batches: stats.retried_batches };
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
  for (const name of collections) out[name] = await withRetry(() => db.collection(name).countDocuments({}));
  return out;
}

export function expectedCounts(before: Record<string, number>, changes: Change[]): Record<string, number> {
  const out = { ...before };
  for (const c of changes) {
    if (c.kind === 'insert') out[c.collection] = (out[c.collection] ?? 0) + 1;
    if (c.kind === 'delete') out[c.collection] = (out[c.collection] ?? 0) - 1;
  }
  return out;
}
