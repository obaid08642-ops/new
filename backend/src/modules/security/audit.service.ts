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

  async findLogs(filter: Record<string, any>, options: { limit?: number; skip?: number; sort?: Record<string, number> } = {}): Promise<any[]> {
    const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;
    return this.connection.collection('audit_logs')
      .find(filter)
      .sort(sort)
      .skip(options.skip || 0)
      .limit(options.limit || 100)
      .toArray();
  }
}
