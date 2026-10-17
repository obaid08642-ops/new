import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { Permission, RequirePermissions } from '../../../common/permissions';
import { UserRole } from '../../../common/enums';
import { ListAdminAlertsQueryDto, UpdateAdminAlertRulesDto } from './admin-urgent-alerts.dto';
import { AdminActor, AdminUrgentAlertsService } from './admin-urgent-alerts.service';

/**
 * Urgent admin alerts (issue #1235): the inbox behind the admin bell (AdminGuard) and /admin/alerts, and the rules
 * the evaluator applies. Reading needs command.center.view like the today screen; each admin only sees the kinds
 * their permissions cover (service.visibleKinds). Changing rules and running the evaluator now need ops.crons.run.
 */
@Controller('admin/urgent-alerts')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminUrgentAlertsController {
  constructor(private readonly svc: AdminUrgentAlertsService) {}

  @Get()
  @RequirePermissions(Permission.COMMAND_CENTER_VIEW)
  list(@CurrentUser() me: AdminActor, @Query() q: ListAdminAlertsQueryDto) {
    return this.svc.list(me, parseInt(q.page || '1', 10) || 1, parseInt(q.limit || '20', 10) || 20, q.filter === 'unread');
  }

  @Get('unread-count')
  @RequirePermissions(Permission.COMMAND_CENTER_VIEW)
  async unreadCount(@CurrentUser() me: AdminActor) {
    return { unread: await this.svc.unreadCount(me) };
  }

  @Post('read-all')
  @RequirePermissions(Permission.COMMAND_CENTER_VIEW)
  readAll(@CurrentUser() me: AdminActor) {
    return this.svc.markAllRead(me);
  }

  @Post(':id/read')
  @RequirePermissions(Permission.COMMAND_CENTER_VIEW)
  read(@CurrentUser() me: AdminActor, @Param('id') id: string) {
    return this.svc.markRead(me, id);
  }

  @Get('rules')
  @RequirePermissions(Permission.COMMAND_CENTER_VIEW)
  rules() {
    return this.svc.getRules();
  }

  @Put('rules')
  @RequirePermissions(Permission.OPS_CRONS_RUN)
  updateRules(@CurrentUser() me: AdminActor, @Body() body: UpdateAdminAlertRulesDto) {
    return this.svc.updateRules(body.rules, me);
  }

  /** Runs the same evaluation the 5-minute schedule runs (dedupe makes a repeat harmless). */
  @Post('evaluate')
  @RequirePermissions(Permission.OPS_CRONS_RUN)
  evaluate() {
    return this.svc.evaluate();
  }
}
