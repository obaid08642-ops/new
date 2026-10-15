import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { RemovePregnancyWeekDto, UpsertPregnancyWeekDto } from './pregnancy-weeks.dto';
import { PregnancyWeeksService } from './pregnancy-weeks.service';

/**
 * Issues #849 / #861: the pregnancy week catalogue (weeks 1-42) the admin fills in admin/src/pages/admin/pregnancy-weeks.tsx.
 * Same guard as the other content routes (admin role + cms.edit); every write is audited with a reason.
 */
@Controller('admin/maternity/weeks')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class PregnancyWeeksAdminController {
  constructor(private readonly weeks: PregnancyWeeksService) {}

  @Get()
  @RequirePermissions(Permission.CMS_EDIT)
  list() {
    return this.weeks.list();
  }

  @Get(':week')
  @RequirePermissions(Permission.CMS_EDIT)
  one(@Param('week') week: string) {
    return this.weeks.one(week);
  }

  @Put(':week')
  @RequirePermissions(Permission.CMS_EDIT)
  upsert(@Param('week') week: string, @Body() body: UpsertPregnancyWeekDto, @CurrentUser() me: { id?: string; full_name?: string; email?: string; role?: string }) {
    return this.weeks.upsert(week, body, me);
  }

  @Delete(':week')
  @RequirePermissions(Permission.CMS_EDIT)
  remove(@Param('week') week: string, @Body() body: RemovePregnancyWeekDto, @CurrentUser() me: { id?: string; full_name?: string; email?: string; role?: string }) {
    return this.weeks.remove(week, body.reason, me);
  }
}
