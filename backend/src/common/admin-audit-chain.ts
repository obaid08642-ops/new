import { createHash } from 'crypto';
import type { Connection } from 'mongoose';
import { Logger } from '@nestjs/common';
import { registerGauge } from './metrics.service';

/**
 * R13: the admin audit log is tamper-EVIDENT. Every row of `admin_actions_log` written through appendAdminAudit carries
 *   seq        1, 2, 3 ... with no gaps
 *   prev_hash  the hash of row seq-1 (64 zeros for the first)
 *   hash       sha256(prev_hash + "\n" + canonical JSON of the row without seq/prev_hash/hash/_id)
 * and `admin_audit_head` holds {seq, hash} of the newest row. The row and the head are written in ONE transaction, so a crash cannot leave one without the
 * other. Editing a row breaks its own hash; deleting or inserting a row breaks `seq`/`prev_hash` of the next; cutting the tail breaks the head. verifyAdminAuditChain
 * reports which. This is not a write-once store: someone with database root can rewrite the WHOLE chain consistently. The protection against that is a copy of the head
 * outside the database - every nightly off-site dump contains the collection, so an older dump's head must still be a prefix of the live chain (docs/platform/R13-admin-hardening.md).
 */
export const ADMIN_LOG = 'admin_actions_log';
export const ADMIN_HEAD = 'admin_audit_head';
export const GENESIS = '0'.repeat(64);
const logger = new Logger('AdminAuditChain');
export const auditChainStats = { chained: 0, unchained: 0, lastOk: 1 };
registerGauge('nabd_admin_audit_unchained_total', 'Admin audit rows written without the hash chain (the chained write failed).', () => auditChainStats.unchained, 'counter');
registerGauge('nabd_admin_audit_chain_ok', '1 when the last nightly verification of the admin audit chain found nothing wrong, 0 otherwise.', () => auditChainStats.lastOk);

/** Stable JSON: object keys sorted, Dates as ISO, undefined dropped. The same input always gives the same bytes. */
export function canonical(v: unknown): string {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (typeof (v as { toJSON?: unknown }).toJSON === 'function') return canonical((v as { toJSON: () => unknown }).toJSON());   // ObjectId, Decimal128, ... as the driver prints them
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}

const CHAIN_FIELDS = new Set(['_id', 'seq', 'prev_hash', 'hash', 'chained']);
export function entryHash(prevHash: string, row: Record<string, unknown>): string {
  const body: Record<string, unknown> = {};
  for (const k of Object.keys(row)) if (!CHAIN_FIELDS.has(k)) body[k] = row[k];
  return createHash('sha256').update(`${prevHash}\n${canonical(body)}`).digest('hex');
}

/** Appends one row to the chain. If the transaction cannot run, the row is still written (never lose an audit entry), flagged `chained:false`, counted and logged loudly. */
export async function appendAdminAudit(conn: Connection, row: Record<string, unknown>): Promise<{ chained: boolean; seq?: number; hash?: string }> {
  const doc = { createdAt: new Date(), ...row };
  try {
    const session = await conn.startSession();
    let out: { seq: number; hash: string } | undefined;
    try {
      await session.withTransaction(async () => {
        const head: any = await conn.collection(ADMIN_HEAD).findOneAndUpdate(
          { _id: 'head' } as any,
          { $inc: { seq: 1 }, $setOnInsert: { hash: GENESIS } } as any,
          { upsert: true, returnDocument: 'after', session },
        );
        const prev = String(head.hash);
        const seq = Number(head.seq);
        const hash = entryHash(prev, doc);
        await conn.collection(ADMIN_HEAD).updateOne({ _id: 'head' } as any, { $set: { hash, updatedAt: new Date() } } as any, { session });
        await conn.collection(ADMIN_LOG).insertOne({ ...doc, seq, prev_hash: prev, hash } as any, { session });
        out = { seq, hash };
      });
    } finally {
      await session.endSession();
    }
    auditChainStats.chained++;
    return { chained: true, ...out! };
  } catch (e: any) {
    auditChainStats.unchained++;
    logger.error(`audit_chain_write_failed action=${String(row.action)} err=${e?.message}: row written WITHOUT the chain`);
    await conn.collection(ADMIN_LOG).insertOne({ ...doc, chained: false } as any);
    return { chained: false };
  }
}

export interface ChainFinding { code: 'hash_mismatch' | 'chain_break' | 'seq_gap' | 'head_mismatch' | 'unchained_entry'; seq?: number; detail?: string }

/** Walks the chain in order and returns what is wrong (empty = intact). Reads every chained row once. */
export async function verifyAdminAuditChain(conn: Connection, maxFindings = 50): Promise<{ ok: boolean; checked: number; head_seq: number; findings: ChainFinding[] }> {
  const findings: ChainFinding[] = [];
  const add = (f: ChainFinding) => { if (findings.length < maxFindings) findings.push(f); };
  const head: any = await conn.collection(ADMIN_HEAD).findOne({ _id: 'head' } as any);
  let prevHash = GENESIS; let expectSeq = 1; let checked = 0;
  const cursor = conn.collection(ADMIN_LOG).find({ seq: { $exists: true } } as any).sort({ seq: 1 });
  for await (const row of cursor as any) {
    checked++;
    if (row.seq !== expectSeq) { add({ code: 'seq_gap', seq: row.seq, detail: `expected ${expectSeq}` }); expectSeq = row.seq; }
    if (row.prev_hash !== prevHash) add({ code: 'chain_break', seq: row.seq });
    if (entryHash(String(row.prev_hash), row) !== row.hash) add({ code: 'hash_mismatch', seq: row.seq });
    prevHash = String(row.hash); expectSeq = row.seq + 1;
  }
  const headSeq = head ? Number(head.seq) : 0;
  if (head && (head.seq !== expectSeq - 1 || head.hash !== prevHash)) add({ code: 'head_mismatch', detail: `head seq ${head.seq}, last row ${expectSeq - 1}` });
  const loose = await conn.collection(ADMIN_LOG).countDocuments({ chained: false } as any);
  if (loose) add({ code: 'unchained_entry', detail: `${loose} row(s) written without the chain` });
  auditChainStats.lastOk = findings.length ? 0 : 1;
  return { ok: findings.length === 0, checked, head_seq: headSeq, findings };
}
