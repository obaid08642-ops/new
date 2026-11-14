import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { FinanceIntegrityService } from './finance-integrity.service';

@Controller('admin/finance/integrity')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class FinanceIntegrityController {
  constructor(private readonly svc: FinanceIntegrityService) {}

  /** Open ledger-invariant and Moyasar-reconciliation findings (R11). Read-only. */
  @Get()
  @RequirePermissions(Permission.FINANCE_READ)
  async open(@Query("limit") limit?: string): Promise<{ count: number; items: Array<Record<string, unknown>> }> {
    const items = await this.svc.openFindings(Number(limit) || 200);
    return { count: items.length, items };
  }
}
