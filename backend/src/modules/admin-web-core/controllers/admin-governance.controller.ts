import { Controller, Put, Body, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SystemConfigExtended } from '../schemas/system-config-extended.schema';
import { FraudAlert } from '../schemas/fraud-alert.schema';
import { AuditLog } from '../schemas/audit-log.schema';
import Redis from 'ioredis';
import { CurrentUser, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';

@Controller('admin/governance')
@Roles(UserRole.ADMIN)
export class AdminGovernanceController {
  private redisClient: Redis;

  constructor(
    @InjectModel(SystemConfigExtended.name) private configModel: Model<SystemConfigExtended>,
    @InjectModel(FraudAlert.name) private fraudAlertModel: Model<FraudAlert>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>
  ) {
    // Note: in a real environment we handle Redis connection gracefully
    // this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  @Put('trigger-emergency-maintenance')
  async triggerEmergencyMaintenance(@CurrentUser() _admin: any, @Body() _payload: { forceMaintenanceState: boolean }) {
    // Redis dispatch, immutable audit attribution, two-person approval, and
    // recovery verification are not implemented in this source tree. Never
    // persist or claim a system-wide maintenance state without them.
    throw new ServiceUnavailableException('emergency maintenance command is not configured');
  }

  @Get('fraud-alerts')
  async getFraudAlerts(
    @Query('q') q?: string,
    @Query('severity') severity?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    // Strictly Immutable Read-Only ABAC Log access — server-side search/pagination
    const filter: any = {};
    if (severity && ['high', 'medium', 'low'].includes(severity)) filter.severity = severity;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { entityName: rx }, { entityId: rx }, { flagReason: rx }, { type: rx },
      ];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const [alerts, total] = await Promise.all([
      this.fraudAlertModel.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).exec(),
      this.fraudAlertModel.countDocuments(filter).exec(),
    ]);
    return { data: alerts, total, page: pageNum, limit: limitNum };
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    // Strictly Immutable Read-Only ABAC Log access — server-side search/pagination
    const filter: any = {};
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { actorId: rx }, { user_id: rx }, { action: rx }, { endpoint: rx }, { resource_kind: rx }, { resource_id: rx },
      ];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const [logs, total] = await Promise.all([
      this.auditLogModel.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);
    return { data: logs, total, page: pageNum, limit: limitNum };
  }
}
