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

/** Where page rows come from when live rows come first and stored rows follow (offset = rows before this page). */
export function fraudPageWindow(liveTotal: number, offset: number, limit: number) {
  const liveSkip = Math.min(offset, liveTotal);
  const liveTake = Math.max(0, Math.min(limit, liveTotal - offset));
  return { liveSkip, liveTake, storedSkip: Math.max(0, offset - liveTotal), storedTake: limit - liveTake };
}

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
    // the severity is looked up in a fixed list: only one of three constants ever reaches the query, never the request value
    const sev = (['high', 'medium', 'low'] as const).find((x) => x === severity);
    if (sev) filter.severity = sev;
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
    if (sev) liveFilter.severity = sev;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      liveFilter.$or = [{ userId: rx }, { providerId: rx }, { flagType: rx }];
    }
    const liveCol = (this.fraudAlertModel as any).db?.collection('fraud_alerts');
    // One list of live rows followed by stored rows: page N reads rows [(N-1)*limit, N*limit) of that list, so page 2 never repeats page 1.
    let liveTotal = 0;
    try { liveTotal = liveCol ? await liveCol.countDocuments(liveFilter) : 0; } catch { liveTotal = 0; }
    const win = fraudPageWindow(liveTotal, (pageNum - 1) * limitNum, limitNum);
    let live: any[] = [];
    try {
      live = liveCol && win.liveTake > 0 ? await liveCol.find(liveFilter).sort({ createdAt: -1 }).skip(win.liveSkip).limit(win.liveTake).toArray() : [];
    } catch { live = []; }
    const [alerts, total] = await Promise.all([
      win.storedTake > 0 ? this.fraudAlertModel.find(filter).sort({ createdAt: -1 }).skip(win.storedSkip).limit(win.storedTake).exec() : Promise.resolve([] as any[]),
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
    return { data: [...normalized, ...alerts.map((a: any) => (a.toObject ? a.toObject() : a))], total: total + liveTotal, page: pageNum, limit: limitNum };
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
