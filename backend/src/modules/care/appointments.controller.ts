import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';import { ApptState } from '../../schemas/appointment.schema';
import { CreateAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto, JoinWaitlistDto, ReportLateDto} from './appointments.dto';
import { FinishAppointmentDto, CancelDto } from './appointments.generated.dto';

@Controller('care/appointments')
@SelfService()
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  // Patient creates appointment
  @Post()
  create(@Body() body: CreateAppointmentDto, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }

  @Get()
  mine(@CurrentUser() user: any, @Query('status') status?: ApptState) {
    return this.svc.listMine(user, status);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.one(user, id);
  }

  @Post('waitlist/join')
  joinWaitlist(@Body() body: JoinWaitlistDto, @CurrentUser() user: any) {
    return this.svc.joinWaitlist(user, body);
  }

  @Post('waitlist/leave/:entryId')
  leaveWaitlist(@Param('entryId') entryId: string, @CurrentUser() user: any) {
    return this.svc.leaveWaitlist(user, entryId);
  }

  @Post('waitlist/offers/:entryId/accept')
  acceptOffer(@Param('entryId') entryId: string, @CurrentUser() user: any) {
    return this.svc.acceptOffer(user, entryId);
  }

  @Patch(':id/no-show')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  markNoShow(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.markNoShow(id, user);
  }

  @Post(':id/report-late')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  reportLate(@Param('id') id: string, @Body() body: ReportLateDto, @CurrentUser() user: any) {
    return this.svc.reportLate(user, id, body.delay_minutes);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any, @Body() body: CancelAppointmentDto) {
    return this.svc.cancel(id, user, body?.reason);
  }

  @Patch(':id/reschedule')
  reschedule(@Param('id') id: string, @CurrentUser() user: any, @Body() body: RescheduleAppointmentDto) {
    return this.svc.reschedule(id, user, body);
  }

  // Doctor / admin only
  @Patch(':id/confirm')
  @Roles(UserRole.DOCTOR, UserRole.HOSPITAL, UserRole.ADMIN)
  confirm(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.confirm(id, user);
  }

  @Patch(':id/check-in')
  @Roles(UserRole.DOCTOR, UserRole.HOSPITAL, UserRole.ADMIN, UserRole.PATIENT)
  checkIn(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.checkIn(id, user);
  }

  @Patch(':id/start')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  start(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.start(id, user);
  }

  @Patch(':id/complete')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.complete(id, user);
  }

  @Post(':id/finish')
  @Roles(UserRole.DOCTOR, UserRole.HOME_CARE)
  finishAppointment(@Param('id') id: string, @Body() body: FinishAppointmentDto, @CurrentUser() user: any) {
    return this.svc.finish(id, body, user);
  }

  @Get(':id/summary')
  summary(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getSummary(id, user);
  }

  /** P22.9 — downloadable visit report PDF (completed visits). */
  @Get(':id/report.pdf')
  async reportPdf(@Param('id') id: string, @CurrentUser() user: any, @Res({ passthrough: true }) res: { set: (h: Record<string, string>) => void }) {
    const buf = await this.svc.visitReportPdf(user, id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="visit-${id.slice(0, 8)}.pdf"` });
    const { Readable } = require('stream') as typeof import('stream');
    return new StreamableFile(Readable.from(buf));
  }

}

/**
 * Admin appointments oversight (appointments-oversight.tsx):
 * list all + cancel any. listMine already returns everything for admins.
 */
@Controller('admin/appointments')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminAppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Get()
  list(@Query('limit') limit?: string, @Query('status') status?: ApptState) {
    return this.svc.adminList(Math.min(Math.max(Number(limit) || 50, 1), 200), status);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: CancelDto, @CurrentUser() user: any) {
    return this.svc.cancel(id, { ...user, role: UserRole.ADMIN }, body?.reason);
  }
}
