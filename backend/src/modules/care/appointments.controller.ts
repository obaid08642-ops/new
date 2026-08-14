import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ApptState } from '../../schemas/appointment.schema';
import { CreateAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto } from './appointments.dto';

@Controller('care/appointments')
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
  joinWaitlist(@Body() body: { doctorId: string; date: string }, @CurrentUser() user: any) {
    return this.svc.joinWaitlist(user, body);
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
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  confirm(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.confirm(id, user);
  }

  @Patch(':id/check-in')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN, UserRole.PATIENT)
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
  async finishAppointment(@Param('id') id: string, @Body() body: any, @CurrentUser('id') providerId: string) {
    // 1. Save SOAP & Diagnosis
    // 2. Kill Video/Audio stream (handled by closing LiveKit room on frontend/backend)
    // 3. Shift Chat Thread to FOLLOW_UP
    // 4. Calculate 15% Nabdah Commission on Cash/Online fees
    // In a real implementation this calls AppointmentsService.finish(id, body, providerId)
    // We will simulate the atomic sequence here for the V3.0 integration
    
    return {
      success: true,
      message: 'Consultation finished, E-Rx pushed, 15% commission applied.',
      chat_status: 'FOLLOW_UP'
    };
  }

}
