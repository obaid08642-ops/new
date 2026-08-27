import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { LiveKitService } from './livekit.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class LiveKitController {

  // ===== NABD PROVIDER BLUEPRINT: PHASE 2 (TELEHEALTH & VIRTUAL ROOM) =====

  @Get('provider/waiting-room')
  getWaitingRoom(@CurrentUser() u: any) {
    return this.svc.getProviderWaitingRoom(u.id);
  }

  @Post('provider/ping-patient')
  pingPatient(@CurrentUser() u: any, @Body() body: { patient_id: string }) {
    return this.svc.pingPatient(u.id, body.patient_id);
  }

  @Post('provider/no-show')
  markNoShow(@CurrentUser() u: any, @Body() body: { appointment_id: string }) {
    return this.svc.markNoShow(u.id, body.appointment_id);
  }

  constructor(private readonly svc: LiveKitService) {}
  
  
  @Post('webhook')
  async webhook(@Body() body: any) {
    // Implement LiveKit webhook verification here
    return { received: true };
  }

  @Post('initiate')
  initiateCall(
    @CurrentUser() u: any,
    @Body() body: { callee_id?: string; call_type?: 'voice' | 'video'; booking_id?: string; appointmentId?: string },
  ) {
    const bookingId = body.booking_id || body.appointmentId;
    return this.svc.initiateCall(u.id, u.name || u.id, body.callee_id || '', body.call_type || 'video', bookingId);
  }

  @Post(':sessionId/join')
  joinCall(@CurrentUser() u: any, @Param('sessionId') sessionId: string) {
    return this.svc.joinCall(sessionId, u.id, u.name || u.id);
  }

  @Post(':sessionId/end')
  endCall(@CurrentUser() u: any, @Param('sessionId') sessionId: string) {
    return this.svc.endCall(sessionId, u.id);
  }

  @Post(':sessionId/reject')
  rejectCall(@CurrentUser() u: any, @Param('sessionId') sessionId: string) {
    return this.svc.rejectCall(sessionId, u.id);
  }

  @Post(':sessionId/metrics')
  saveMetrics(
    @CurrentUser() u: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { metrics: Array<{ packet_loss: number; jitter: number; rtt: number; bitrate: number }> }
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
    @Body() body: { muted: boolean },
  ) {
    return this.svc.muteParticipant(roomName, pid, body.muted);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/rooms/:roomName/remove/:participantId')
  removeParticipant(@Param('roomName') roomName: string, @Param('participantId') pid: string) {
    return this.svc.removeParticipant(roomName, pid);
  }
}
