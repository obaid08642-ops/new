import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_RECORD_EVENT } from '../audit-trail/audit-emitter';

/**
 * Legacy adapter. The `@Audited()` interceptor and older callers still land
 * here; every write is ALSO fanned into the Phase-23 trail via the
 * `audit.record` event (fire-and-forget) so admin config/price/user/provider
 * mutations covered by the interceptor appear in `audit_events` with no gap
 * in history. New code should call `emitAudit(...)` directly.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  private mirrorToTrail(entry: {
    action: string; actorId?: string; actorRole?: string; entityType?: string; entityId?: string;
    before?: any; after?: any; ip?: string; userAgent?: string; correlationId?: string;
  }): void {
    try {
      this.events?.emit(AUDIT_RECORD_EVENT, {
        action: entry.action,
        actor: { id: entry.actorId, role: entry.actorRole || 'unknown' },
        entity: entry.entityType ? { type: entry.entityType, id: entry.entityId } : undefined,
        diff: entry.before !== undefined || entry.after !== undefined
          ? { before: entry.before, after: entry.after } : undefined,
        where: entry.ip || entry.userAgent ? { ip: entry.ip, user_agent: entry.userAgent } : undefined,
        request_id: entry.correlationId,
        category: 'admin',
      });
    } catch { /* audit must never break the caller */ }
  }

  async log(params: {
    action: string;
    actorId: string;
    actorRole: string;
    entityType: string;
    entityId: string;
    before?: any;
    after?: any;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const auditEntry = {
      ...params,
      timestamp: new Date(),
      ip: params.metadata?.ip,
      userAgent: params.metadata?.userAgent,
    };

    await this.connection.collection('audit_logs').insertOne(auditEntry);
    this.mirrorToTrail({
      action: params.action, actorId: params.actorId, actorRole: params.actorRole,
      entityType: params.entityType, entityId: params.entityId,
      before: params.before, after: params.after,
      ip: params.metadata?.ip, userAgent: params.metadata?.userAgent,
      correlationId: (params.metadata as any)?.correlationId,
    });
  }

  async write(params: {
    action: string;
    user_id?: string;
    role?: string;
    ip?: string;
    user_agent?: string;
    resource_kind: string;
    resource_id?: string;
    details?: Record<string, any>;
    severity?: string;
    correlation_id?: string;
  }): Promise<void> {
    const auditEntry = {
      action: params.action,
      actorId: params.user_id,
      actorRole: params.role,
      entityType: params.resource_kind,
      entityId: params.resource_id,
      before: params.details?.diff ? Object.fromEntries(
        Object.entries(params.details.diff).map(([k, v]) => [k, (v as any).old])
      ) : undefined,
      after: params.details?.diff ? Object.fromEntries(
        Object.entries(params.details.diff).map(([k, v]) => [k, (v as any).new])
      ) : undefined,
      metadata: {
        ip: params.ip,
        userAgent: params.user_agent,
        correlationId: params.correlation_id,
        requestBody: params.details?.request_body,
        diff: params.details?.diff,
      },
      severity: params.severity || 'info',
      timestamp: new Date(),
    };

    await this.connection.collection('audit_logs').insertOne(auditEntry);
    this.mirrorToTrail({
      action: params.action, actorId: params.user_id, actorRole: params.role,
      entityType: params.resource_kind, entityId: params.resource_id,
      before: auditEntry.before, after: auditEntry.after,
      ip: params.ip, userAgent: params.user_agent, correlationId: params.correlation_id,
    });
  }

  async findLogs(filter: Record<string, any>, options: { limit?: number; skip?: number; sort?: Record<string, 1 | -1> } = {}): Promise<any[]> {
    const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;
    return this.connection.collection('audit_logs')
      .find(filter)
      .sort(sort as any)
      .skip(options.skip || 0)
      .limit(options.limit || 100)
      .toArray();
  }
}
