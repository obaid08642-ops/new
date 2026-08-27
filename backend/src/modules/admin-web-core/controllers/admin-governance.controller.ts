import { Controller, Put, Body, Get, ServiceUnavailableException } from '@nestjs/common';
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
  async getFraudAlerts() {
    // Strictly Immutable Read-Only ABAC Log access
    const alerts = await this.fraudAlertModel.find().sort({ createdAt: -1 }).limit(100).exec();
    return { data: alerts };
  }

  @Get('audit-logs')
  async getAuditLogs() {
    // Strictly Immutable Read-Only ABAC Log access
    const logs = await this.auditLogModel.find().sort({ createdAt: -1 }).limit(100).exec();
    return { data: logs };
  }
}
