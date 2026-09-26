import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEntryInput {
  action: string;
  actor: { id?: string; full_name?: string; email?: string; role?: string };
  target_type: string;
  target_id: string;
  reason?: string;
  before?: any;
  after?: any;
  meta?: Record<string, any>;
  ip?: string;
  user_agent?: string;
}

/**
 * Shared audit writer for the Enterprise Control Center.
 *
 * Writes to the same `admin_actions_log` collection the existing
 * AdminAuthorityModule uses (raw collection access avoids duplicate mongoose
 * model registration), and mirrors every entry onto the event bus so the
 * realtime command center can stream admin actions live.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger('AdminAudit');

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly bus?: EventEmitter2,
  ) {}

  async write(entry: AuditEntryInput): Promise<void> {
    const doc = {
      id: uuidv4(),
      action: entry.action,
      admin_id: entry.actor?.id || 'unknown',
      admin_name: entry.actor?.full_name || entry.actor?.email || null,
      admin_role: entry.actor?.role || null,
      target_type: entry.target_type,
      target_id: entry.target_id,
      reason: entry.reason ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      meta: entry.meta ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.user_agent ?? null,
      createdAt: new Date(),
    };
    try {
      await this.conn.collection('admin_actions_log').insertOne(doc as any);
    } catch (e: any) {
      // Auditing must never break the business action — but it MUST be loud.
      this.logger.error(`audit_write_failed action=${entry.action} err=${e?.message}`);
    }
    try {
      this.bus?.emit({
        type: `admin.${entry.action}`,
        entity_type: entry.target_type,
        entity_id: entry.target_id,
        actor_account_id: doc.admin_id,
        actor_role: doc.admin_role || 'admin',
        reason_code: doc.reason,
        before: doc.before,
        after: doc.after,
      } as any);
    } catch {
      /* event bus optional */
    }
  }

  /** Server-side paginated/sorted/filterable audit query for the UI. */
  async list(filter: { action?: string; admin_id?: string; target_type?: string; target_id?: string; from?: string; to?: string }, page = 1, limit = 50) {
    const q: any = {};
    if (filter.action) q.action = filter.action;
    if (filter.admin_id) q.admin_id = filter.admin_id;
    if (filter.target_type) q.target_type = filter.target_type;
    if (filter.target_id) q.target_id = filter.target_id;
    const range: any = {};
    if (filter.from) range.$gte = new Date(filter.from);
    if (filter.to) range.$lte = new Date(filter.to);
    if (Object.keys(range).length) q.createdAt = range;

    const col = this.conn.collection('admin_actions_log');
    const p = Math.max(1, page);
    const l = Math.min(200, Math.max(1, limit));
    const [items, total] = await Promise.all([
      col.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).toArray(),
      col.countDocuments(q),
    ]);
    return { data: items.map(({ _id, ...rest }: any) => rest), total, page: p, pages: Math.ceil(total / l) };
  }
}
