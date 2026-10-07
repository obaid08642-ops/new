import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AuditService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

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
