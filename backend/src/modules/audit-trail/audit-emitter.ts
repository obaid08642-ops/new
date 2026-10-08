import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Phase 23.2 — single fan-in for every audit emission.
 *
 * Domain code NEVER inserts into `audit_events` (or any legacy audit
 * collection) directly. It calls `emitAudit(...)`, which publishes a
 * fire-and-forget `audit.record` event; `AuditTrailService` persists it
 * through the queue. Emission never blocks the user flow and never throws:
 * failures are logged by the subscriber, not the caller.
 */

export const AUDIT_RECORD_EVENT = 'audit.record';

export interface AuditRecordInput {
  action: string;
  actor?: { id?: string; role: string; impersonator?: { id?: string; role?: string } };
  entity?: { type: string; id?: string };
  diff?: { before?: any; after?: any };
  where?: { ip?: string; device_id?: string; user_agent?: string; platform?: string; app_version?: string };
  why?: string;
  request_id?: string;
  category?: string;
  at?: Date;
}

/** Fire-and-forget: safe to call from any request path (never throws). */
export function emitAudit(emitter: Pick<EventEmitter2, 'emit'> | undefined | null, input: AuditRecordInput): void {
  try {
    (emitter as EventEmitter2 | undefined | null)?.emit?.(AUDIT_RECORD_EVENT, input);
  } catch {
    // Audit must never break the user flow.
  }
}
