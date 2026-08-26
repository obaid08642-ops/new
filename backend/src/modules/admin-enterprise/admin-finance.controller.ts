import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { FinanceSuiteService, Granularity } from './finance-suite.service';

/**
 * A2 — Finance Suite: revenue dashboards, server-computed commissions/VAT,
 * daily gateway↔ledger reconciliation and dual-approval payout batches.
 */
@Controller('admin/finance')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminFinanceSuiteController {
  constructor(private readonly svc: FinanceSuiteService) {}

  @Get('revenue')
  @RequirePermissions(Permission.FINANCE_READ)
  revenue(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('granularity') granularity: Granularity = 'day',
  ) {
    const g = ['day', 'week', 'month'].includes(String(granularity)) ? granularity : 'day';
    return this.svc.revenue({ from, to, granularity: g });
  }

  @Get('commissions')
  @RequirePermissions(Permission.FINANCE_READ)
  commissions(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.commissions({ from, to });
  }

  @Post('commissions/config')
  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  updateConfig(@Body() b: any, @CurrentUser() me: any) {
    return this.svc.upsertCommissionConfig(b || {}, me, b?.reason);
  }

  @Get('reconciliation')
  @RequirePermissions(Permission.FINANCE_READ)
  reconciliation(@Query('date') date: string) {
    return this.svc.reconciliation(date);
  }

  @Get('payouts')
  @RequirePermissions(Permission.FINANCE_READ)
  payoutQueue(@Query('status') status?: string, @Query('page') page = '1', @Query('limit') limit = '25') {
    return this.svc.payoutQueue(status, parseInt(page, 10) || 1, parseInt(limit, 10) || 25);
  }

  @Post('payouts/:id/approve')
  @RequirePermissions(Permission.FINANCE_PAYOUT_APPROVE)
  approvePayout(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    return this.svc.approvePayout(id, me, b?.reason, 'approve');
  }

  @Post('payouts/:id/reject')
  @RequirePermissions(Permission.FINANCE_PAYOUT_APPROVE)
  rejectPayout(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    return this.svc.approvePayout(id, me, b?.reason, 'reject');
  }

  @Get('providers/:providerId/statement')
  @RequirePermissions(Permission.FINANCE_READ)
  providerStatement(@Param('providerId') providerId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.providerStatement(providerId, from, to);
  }
}
