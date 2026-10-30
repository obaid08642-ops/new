import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentOutcomesService } from './appointment-outcomes.service';
import { CurrentUser, JwtAuthGuard, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';import { ApptState } from '../../schemas/appointment.schema';
import { CreateAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto, JoinWaitlistDto, DoctorPositionDto } from './appointments.dto';
import { FinishAppointmentDto, CancelDto } from './appointments.generated.dto';
import { Permission, RequirePermissions } from '../../common/permissions';

@Controller('care/appointments')
@SelfService()
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private svc: AppointmentsService, private outcomes: AppointmentOutcomesService) {}

  // Patient creates appointment
  @Post()
  create(@Body() body: CreateAppointmentDto, @CurrentUser() user: any) {
    return this.svc.create(user, body);
  }

  @Get()
  mine(@CurrentUser() user: any, @Query('status') status?: ApptState) {
    return this.svc.listMine(user, status);
  }

  @Get('calls/mine')
  myCalls(@CurrentUser() user: any) {
    return this.svc.callsFor(user);
  }

  /** The hub badge: new outcomes (prescription, unread report or certificate, referral) across the patient's completed visits. */
  @Get('outcomes/badge')
  outcomesBadge(@CurrentUser() user: any) {
    return this.outcomes.badge(user);
  }

  /** What the visit left the patient. Patient-owned only: anyone else gets 404. */
  @Get(':id/outcomes')
  appointmentOutcomes(@Param('id') id: string, @CurrentUser() user: any) {
    return this.outcomes.outcomes(user, id);
  }

  /** The patient has seen the visit's outcomes (clears its badge). */
  @Patch(':id/outcomes/seen')
  markOutcomesSeen(@Param('id') id: string, @CurrentUser() user: any) {
    return this.outcomes.markSeen(user, id);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.one(user, id);
  }

  @Post('waitlist/join')
  joinWaitlist(@Body() body: JoinWaitlistDto, @CurrentUser() user: any) {
    return this.svc.joinWaitlist(user, body);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any, @Body() body: CancelAppointmentDto) {
    return this.svc.cancel(id, user, body?.reason);
  }

  @Get(':id/refund/preview')
  refundPreview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.previewRefund(id, user);
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

  @Patch(':id/en-route')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  enRoute(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.enRoute(id, user);
  }

  @Post(':id/position')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  position(@Param('id') id: string, @CurrentUser() user: any, @Body() body: DoctorPositionDto) {
    return this.svc.updatePosition(id, user, body.lat, body.lng);
  }

  @Patch(':id/arrive')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  arrive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.arrive(id, user);
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

  @Get(':id/call')
  call(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.callJoin(id, user);
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

  @RequirePermissions(Permission.ORDER_CANCEL)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: CancelDto, @CurrentUser() user: any) {
    return this.svc.cancel(id, { ...user, role: UserRole.ADMIN }, body?.reason);
  }
}
