import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { RiskService } from './risk.service';
import { AuditService } from '../security/security.module';

/** 22.11 — the admin's risk dashboard: who needs a look, why, and the rules behind the score. */
@Controller('admin/risk')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class RiskController {
  constructor(private readonly risk: RiskService, private readonly audit: AuditService) {}

  @Get('summary')
  @RequirePermissions(Permission.ANALYTICS_READ)
  summary() { return this.risk.summary(); }

  @Get('users')
  @RequirePermissions(Permission.ANALYTICS_READ)
  users(@Query('level') level?: string, @Query('signal') signal?: string, @Query('page') page?: string, @Query('limit') limit?: string): ReturnType<RiskService['list']> {
    return this.risk.list({ level, signal, page: Number(page) || 1, limit: Number(limit) || 25 });
  }

  @Get('users/:id')
  @RequirePermissions(Permission.ANALYTICS_READ)
  detail(@Param('id') id: string): ReturnType<RiskService['detail']> { return this.risk.detail(id); }

  /** Recompute one person's score now (after an admin changed a rule, or to check a report). It can raise an alert, so it needs the security permission and leaves an audit row. */
  @Post('users/:id/rescore')
  @RequirePermissions(Permission.SECURITY_MANAGE)
  async rescore(@CurrentUser() admin: { id?: string; role?: string }, @Param('id') id: string) {
    if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)) throw new BadRequestException('invalid_user_id');
    const score = (await this.risk.evaluate(id, { force: true })) ?? { user_id: id, score: 0, level: 'low', signals: [] };
    await this.audit.write({ action: 'risk.rescore', user_id: admin?.id, role: admin?.role, resource_kind: 'user', resource_id: id, details: { score: score.score, level: score.level } });
    return score;
  }
}
