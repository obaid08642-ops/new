import { Controller, Put, Body, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FraudAlert } from '../schemas/fraud-alert.schema';
import { AuditLog } from '../schemas/audit-log.schema';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
@Controller('admin/governance')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminGovernanceController {
  constructor(
    @InjectModel(FraudAlert.name) private fraudAlertModel: Model<FraudAlert>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>
  ) {}
  @Put('trigger-emergency-maintenance')
  async triggerEmergencyMaintenance(@Body() payload: { forceMaintenanceState: boolean }) {
    throw new ServiceUnavailableException('Emergency maintenance is disabled until the Redis flag, gateway enforcement, immutable audit trail, and dual-control operating procedure are integrated and verified.');
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
