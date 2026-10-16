import { Controller, Put, Body, Get, Query, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SystemConfigExtended } from '../schemas/system-config-extended.schema';
import { FraudAlert } from '../schemas/fraud-alert.schema';
import { AuditLog } from '../schemas/audit-log.schema';
import { CurrentUser, Roles } from '../../../../common/auth.guard';
import { UserRole } from '../../../../common/enums';
import { Permission, RequirePermissions } from '../../../../common/permissions';
import { KillSwitchesService } from '../../../kill-switches/kill-switches.service';
import { TriggerEmergencyMaintenanceDto } from './admin-governance.dto';

@Controller('admin/governance')
@Roles(UserRole.ADMIN)
export class AdminGovernanceController {
  constructor(
    @InjectModel(SystemConfigExtended.name) private configModel: Model<SystemConfigExtended>,
    @InjectModel(FraudAlert.name) private fraudAlertModel: Model<FraudAlert>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    @Optional() private readonly switches?: KillSwitchesService,
  ) {}

  /**
   * Issues 955 / 995: platform-wide emergency maintenance. Super admin only (modules.manage, same as the module and
   * kill switches), reason required and audited. On: every app shows its maintenance screen and the server refuses
   * every non-admin write (EmergencyMaintenanceMiddleware). Off: the apps' previous banner flags come back exactly.
   */
  @Get('emergency-maintenance')
  @RequirePermissions(Permission.MODULES_MANAGE)
  emergencyMaintenance() {
    if (!this.switches) throw new ServiceUnavailableException('kill_switches_unavailable');
    return this.switches.emergencyState();
  }

  @Put('trigger-emergency-maintenance')
  @RequirePermissions(Permission.MODULES_MANAGE)
  async triggerEmergencyMaintenance(@CurrentUser() admin: { id?: string; role?: string; email?: string; full_name?: string }, @Body() payload: TriggerEmergencyMaintenanceDto) {
    if (!this.switches) throw new ServiceUnavailableException('kill_switches_unavailable');
    return this.switches.setEmergency(payload.forceMaintenanceState, payload.reason, admin);
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
    // Live detector writes (finance-engine/nabd-extensions) land in `fraud_alerts`
    // (userId/providerId/flagType/confidenceScore/status) — merge with the legacy
    // `fraudalerts` shape so the panel is never empty when detectors fire.
    const liveFilter: any = {};
    if (severity && ['high', 'medium', 'low'].includes(severity)) liveFilter.severity = severity;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      liveFilter.$or = [{ userId: rx }, { providerId: rx }, { flagType: rx }];
    }
    const liveCol = (this.fraudAlertModel as any).db?.collection('fraud_alerts');
    let live: any[] = [];
    try {
      live = liveCol ? await liveCol.find(liveFilter).sort({ createdAt: -1 }).limit(limitNum).toArray() : [];
    } catch { live = []; }
    const [alerts, total] = await Promise.all([
      this.fraudAlertModel.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).exec(),
      this.fraudAlertModel.countDocuments(filter).exec(),
    ]);
    const normalized = live.map((d: any) => ({
      entityId: d.userId || d.providerId || d.id,
      entityName: d.providerId ? `مزود ${d.providerId}` : `مستخدم ${d.userId || ''}`,
      type: d.providerId ? 'provider' : 'patient',
      flagReason: `${d.flagType} (ثقة ${Math.round((d.confidenceScore || 0) * 100)}%)`,
      severity: d.severity,
      status: d.status,
      createdAt: d.createdAt,
    }));
    return { data: [...normalized, ...alerts.map((a: any) => (a.toObject ? a.toObject() : a))], total: total + live.length, page: pageNum, limit: limitNum };
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
