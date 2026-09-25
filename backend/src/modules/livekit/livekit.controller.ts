import { Controller, Post, Get, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Roles, SelfService, Public, JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { LiveKitService } from './livekit.service';
import { PingPatientDto, MarkNoShowDto, InitiateCallDto, SaveMetricsDto, MuteParticipantDto } from './livekit.dto';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class LiveKitController {

  // ===== NABD PROVIDER BLUEPRINT: PHASE 2 (TELEHEALTH & VIRTUAL ROOM) =====

  @Get('provider/waiting-room')
  getWaitingRoom(@CurrentUser() u: any) {
    return this.svc.getProviderWaitingRoom(u.id);
  }

  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.AMBULANCE, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('provider/ping-patient')
  pingPatient(@CurrentUser() u: any, @Body() body: PingPatientDto) {
    return this.svc.pingPatient(u.id, body.patient_id);
  }

  @Roles(UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.HOSPITAL, UserRole.AMBULANCE, UserRole.DELIVERY, UserRole.ADMIN)
  @Post('provider/no-show')
  markNoShow(@CurrentUser() u: any, @Body() body: MarkNoShowDto) {
    return this.svc.markNoShow(u.id, body.appointment_id);
  }

  constructor(private readonly svc: LiveKitService) {}
  
  
  @Public()
  @Post('webhook')
  async webhook(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.svc.handleWebhook(body, req?.headers?.authorization);
  }

  @SelfService()
  @Post('initiate')
  initiateCall(
    @CurrentUser() u: any,
    @Body() body: InitiateCallDto,
  ) {
    const bookingId = body.booking_id || body.appointmentId;
    return this.svc.initiateCall(u.id, u.name || u.id, body.callee_id || '', body.call_type || 'video', bookingId);
  }

  @SelfService()
  @Post(':sessionId/join')
  joinCall(@CurrentUser() u: any, @Param('sessionId') sessionId: string) {
    return this.svc.joinCall(sessionId, u.id, u.name || u.id);
  }

  @SelfService()
  @Post(':sessionId/end')
  endCall(@CurrentUser() u: any, @Param('sessionId') sessionId: string) {
    return this.svc.endCall(sessionId, u.id);
  }

  @SelfService()
  @Post(':sessionId/reject')
  rejectCall(@CurrentUser() u: any, @Param('sessionId') sessionId: string) {
    return this.svc.rejectCall(sessionId, u.id);
  }

  @SelfService()
  @Post(':sessionId/metrics')
  saveMetrics(
    @CurrentUser() u: any,
    @Param('sessionId') sessionId: string,
    @Body() body: SaveMetricsDto
  ) {
    return this.svc.saveMetrics(sessionId, u.id, body.metrics);
  }

  @Get('history')
  history(@CurrentUser() u: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.getCallHistory(u.id, +page, +limit);
  }

  @Get('sessions/:sessionId')
  getSession(@CurrentUser() u: any, @Param('sessionId') sessionId: string) {
    return this.svc.getSessionById(sessionId, u.id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/rooms')
  getRooms() {
    return this.svc.getActiveRooms();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics')
  getAnalytics() {
    return this.svc.getCallAnalytics();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/rooms/:roomName/participants')
  getParticipants(@Param('roomName') roomName: string) {
    return this.svc.getRoomParticipants(roomName);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/rooms/:roomName/mute/:participantId')
  muteParticipant(
    @Param('roomName') roomName: string,
    @Param('participantId') pid: string,
    @Body() body: MuteParticipantDto,
  ) {
    return this.svc.muteParticipant(roomName, pid, body.muted);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/rooms/:roomName/remove/:participantId')
  removeParticipant(@Param('roomName') roomName: string, @Param('participantId') pid: string) {
    return this.svc.removeParticipant(roomName, pid);
  }
}
