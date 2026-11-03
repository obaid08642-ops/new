import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { DbIntegrityService } from './db-integrity.service';

@Controller('admin/db-integrity')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class DbIntegrityController {
  constructor(private readonly svc: DbIntegrityService) {}

  /** Open findings of the nightly invariant and unique-index check (R14). Read-only. */
  @Get()
  @RequirePermissions(Permission.DATA_EXPORT)
  async open(): Promise<{ count: number; items: Array<Record<string, unknown>> }> {
    const items = await this.svc.open();
    return { count: items.length, items };
  }
}
