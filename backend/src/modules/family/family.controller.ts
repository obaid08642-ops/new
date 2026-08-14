import { JwtAuthGuard } from '../../common/auth.guard';
import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { FamilyService } from './family.service';

@UseGuards(JwtAuthGuard)
@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  // ── Group Management ───────────────────────────────────────────────────────

  /** POST /api/v1/family/create — Create a new family group */
  @Post('create')
  create(@Req() req: any, @Body() body: { name: string }) {
    const userId = req.user?.id ?? 'guest';
    return this.familyService.createGroup(userId, body.name);
  }

  /** GET /api/v1/family/my-group — Get current user's family group */
  @Get('my-group')
  myGroup(@Req() req: any) {
    return this.familyService.getMyGroup(req.user?.id ?? 'guest');
  }

  /** POST /api/v1/family/invite — Generate an invite code (owner only) */
  @Post('invite')
  generateInvite(@Req() req: any) {
    return this.familyService.generateInvite(req.user?.id ?? 'guest');
  }

  /** POST /api/v1/family/join — Join a group via invite code */
  @Post('join')
  join(@Req() req: any, @Body() body: { invite_code: string; display_name?: string }) {
    return this.familyService.joinGroup(req.user?.id ?? 'guest', body.invite_code, body.display_name);
  }

  /** DELETE /api/v1/family/remove-member/:userId — Remove a member (owner only) */
  @Delete('remove-member/:userId')
  removeMember(@Req() req: any, @Param('userId') targetUserId: string) {
    return this.familyService.removeMember(req.user?.id ?? 'guest', targetUserId);
  }

  /** GET /api/v1/family/members — List all group members */
  @Get('members')
  listMembers(@Req() req: any) {
    return this.familyService.listMembers(req.user?.id ?? 'guest');
  }

  /** GET /api/v1/family/member-health/:userId — View member's health (permission-gated) */
  @Get('member-health/:userId')
  getMemberHealth(@Req() req: any, @Param('userId') targetUserId: string) {
    return this.familyService.getMemberHealth(req.user?.id ?? 'guest', targetUserId);
  }

  /** GET /api/v1/family/emergency-contacts — Get family emergency contacts */
  @Get('emergency-contacts')
  emergencyContacts(@Req() req: any) {
    return this.familyService.getEmergencyContacts(req.user?.id ?? 'guest');
  }

  // ── Shared Calendar ────────────────────────────────────────────────────────

  /** POST /api/v1/family/calendar/event — Add a shared calendar event */
  @Post('calendar/event')
  addEvent(@Req() req: any, @Body() body: any) {
    return this.familyService.addCalendarEvent(req.user?.id ?? 'guest', body);
  }

  /** GET /api/v1/family/calendar — Get shared calendar events */
  @Get('calendar')
  getCalendar(@Req() req: any) {
    return this.familyService.getCalendarEvents(req.user?.id ?? 'guest');
  }

  /** DELETE /api/v1/family/calendar/event/:eventId — Delete a calendar event */
  @Delete('calendar/event/:eventId')
  deleteEvent(@Req() req: any, @Param('eventId') eventId: string) {
    return this.familyService.deleteCalendarEvent(req.user?.id ?? 'guest', eventId);
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  /** POST /api/v1/family/permissions/request — Request expanded permissions */
  @Post('permissions/request')
  requestPermissions(
    @Req() req: any,
    @Body() body: { target_member_id: string; permissions: string[] },
  ) {
    return this.familyService.requestPermissions(
      req.user?.id ?? 'guest',
      body.target_member_id,
      body.permissions,
    );
  }

  /** GET /api/v1/family/permissions/pending — List pending permission requests (owner) */
  @Get('permissions/pending')
  pendingRequests(@Req() req: any) {
    return this.familyService.getPendingPermissionRequests(req.user?.id ?? 'guest');
  }

  /** PUT /api/v1/family/permissions/respond/:requestId — Respond to permission request */
  @Put('permissions/respond/:requestId')
  respondPermission(
    @Req() req: any,
    @Param('requestId') requestId: string,
    @Body() body: { decision: 'approved' | 'rejected'; note?: string },
  ) {
    return this.familyService.respondPermission(
      req.user?.id ?? 'guest',
      requestId,
      body.decision,
      body.note,
    );
  }
}
