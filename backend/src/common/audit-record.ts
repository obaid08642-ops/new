/**
 * 23.2 — one way for a service to put an event in the audit trail.
 *
 * Several services used to `insertOne` a row straight into `audit_logs`. Those rows had no sequence and no hash, so they
 * sat outside the tamper-evident chain (23.3) and each had its own field names. `recordAudit` hands the event to the
 * chain writer (`AuditService.write`, which registers itself here), so the row is chained, carries the origin of the
 * request and has the standard fields. The raw insert remains only as the fallback when no chain writer exists (a unit
 * test that builds a service without the security module).
 */
import type { Connection } from 'mongoose';
import type { AuditEntry } from '../modules/security/security.module';

type Sink = (entry: AuditEntry) => Promise<void>;
let sink: Sink | null = null;

/** Called once by AuditService when it is constructed. */
export function registerAuditSink(fn: Sink | null): void {
  sink = fn;
}

export async function recordAudit(conn: Pick<Connection, 'collection'> | undefined, entry: AuditEntry): Promise<void> {
  if (sink) return sink(entry);
  try {
    await conn?.collection('audit_logs').insertOne({ id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...entry, created_at: new Date() } as never);
  } catch {
    // The caller's action must not fail because the trail could not be written.
  }
}
