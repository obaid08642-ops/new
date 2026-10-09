import * as crypto from 'crypto';

/**
 * Phase 23 — tamper-evident hash chain (pure functions, no Nest/DB deps).
 *
 * Each audit event carries `prev_hash` (hash of the previous event) and `hash`
 * (SHA-256 over prev_hash + canonical event body). Editing or deleting any
 * event breaks every later link, and `verifyEventChain` reports where.
 */

export interface HashableEventBody {
  action: string;
  actor?: unknown;
  entity?: unknown;
  diff?: unknown;
  at?: unknown;
  request_id?: string | null;
}

export interface ChainedEvent extends HashableEventBody {
  prev_hash: string | null;
  hash: string;
}

export const GENESIS_PREV_HASH = 'GENESIS';

/** Deterministic JSON: object keys sorted recursively so hashing is stable. */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`).join(',')}}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function computeEventHash(prevHash: string | null, body: HashableEventBody): string {
  const canonical = canonicalize({
    action: body.action,
    actor: body.actor ?? null,
    entity: body.entity ?? null,
    diff: body.diff ?? null,
    at: body.at instanceof Date ? body.at.toISOString() : (body.at ?? null),
    request_id: body.request_id ?? null,
  });
  return crypto.createHash('sha256').update(`${prevHash || GENESIS_PREV_HASH}|${canonical}`).digest('hex');
}

export interface ChainVerifyResult {
  ok: boolean;
  checked: number;
  /** 0-based index of the first event whose link is broken. */
  brokenAt?: number;
  reason?: string;
}

/**
 * Recomputes every link. Returns the first break so callers can alert.
 * Events must be in append order (oldest first).
 */
export function verifyEventChain(events: ChainedEvent[]): ChainVerifyResult {
  let prev: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if ((e.prev_hash ?? null) !== prev) {
      return { ok: false, checked: i, brokenAt: i, reason: 'prev_hash_mismatch' };
    }
    const recomputed = computeEventHash(e.prev_hash ?? null, e);
    if (recomputed !== e.hash) {
      return { ok: false, checked: i, brokenAt: i, reason: 'hash_mismatch' };
    }
    prev = e.hash;
  }
  return { ok: true, checked: events.length };
}
