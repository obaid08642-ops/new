import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { RiskService } from './risk.service';

/** 22.11 — the admin's risk dashboard: who needs a look, why, and the rules behind the score. */
@Controller('admin/risk')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class RiskController {
  constructor(private readonly risk: RiskService) {}

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

  /** Recompute one person's score now (after an admin changed a rule, or to check a report). */
  @Post('users/:id/rescore')
  @RequirePermissions(Permission.ANALYTICS_READ)
  async rescore(@CurrentUser('id') _adminId: string, @Param('id') id: string, @Body() _body: Record<string, never>) {
    if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)) throw new BadRequestException('invalid_user_id');
    return (await this.risk.evaluate(id, { force: true })) ?? { user_id: id, score: 0, level: 'low', signals: [] };
  }
}
