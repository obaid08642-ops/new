import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { DecideNoShowDto, DisputeNoShowDto } from './provider-no-show.dto';
import { ProviderNoShowService } from './provider-no-show.service';

/** The doctor's side of a patient's "provider did not come" report: the reports on their visits and the one dispute (24 hours, with a reason). */
@UseGuards(JwtAuthGuard)
@Controller('provider/no-show-reports')
@Roles(UserRole.DOCTOR)
export class ProviderNoShowController {
  constructor(private readonly svc: ProviderNoShowService) {}

  @Get() list(@CurrentUser() user: any): Promise<{ count: number; items: any[] }> { return this.svc.listForDoctor(user); }
  @Post(':appointmentId/dispute') dispute(@CurrentUser() user: any, @Param('appointmentId') id: string, @Body() body: DisputeNoShowDto) { return this.svc.dispute(user, id, body?.reason); }
}

/** Admin: the disputed reports waiting for a decision, the flagged patients (2 reports in 30 days), and the decision. */
@UseGuards(JwtAuthGuard)
@Controller('admin/provider-no-show-reports')
@Roles(UserRole.ADMIN)
export class AdminProviderNoShowController {
  constructor(private readonly svc: ProviderNoShowService) {}

  @Get() @RequirePermissions(Permission.APPOINTMENT_READ)
  list(@Query('status') status?: string, @Query('flagged') flagged?: string): Promise<{ count: number; items: any[] }> { return this.svc.listForAdmin({ status, flagged }); }

  @Post(':appointmentId/decide') @RequirePermissions(Permission.APPOINTMENT_UPDATE)
  decide(@CurrentUser() admin: any, @Param('appointmentId') id: string, @Body() body: DecideNoShowDto) { return this.svc.decide(admin, id, body?.decision, body?.note); }
}
