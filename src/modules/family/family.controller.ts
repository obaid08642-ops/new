import { JwtAuthGuard, NoGuestsGuard } from '../../common/auth.guard';
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { FamilyService } from './family.service';

@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  private authenticatedUserId(req: any): string {
    const userId = req?.user?.id;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new UnauthorizedException('authenticated_user_required');
    }
    return userId;
  }

  // ── Group Management ───────────────────────────────────────────────────────
  @Post('create')
  create(@Req() req: any, @Body() body: { name: string }) {
    return this.familyService.createGroup(this.authenticatedUserId(req), body.name);
  }

  @Get('my-group')
  myGroup(@Req() req: any) {
    return this.familyService.getMyGroup(this.authenticatedUserId(req));
  }

  @Post('invite')
  generateInvite(@Req() req: any) {
    return this.familyService.generateInvite(this.authenticatedUserId(req));
  }

  @Post('join')
  join(@Req() req: any, @Body() body: { invite_code: string; display_name?: string; relation?: string }) {
    return this.familyService.joinGroup(this.authenticatedUserId(req), body.invite_code, body.display_name, body.relation);
  }

  @Post('leave')
  leave(@Req() req: any) {
    return this.familyService.leaveGroup(this.authenticatedUserId(req));
  }

  @Patch('member/:userId/relation')
  setRelation(@Req() req: any, @Param('userId') targetUserId: string, @Body() body: { relation: string }) {
    return this.familyService.updateMemberRelation(this.authenticatedUserId(req), targetUserId, body.relation);
  }

  @Patch('member/:userId/permissions')
  setPermissions(@Req() req: any, @Param('userId') targetUserId: string, @Body() body: { permissions: string[] }) {
    return this.familyService.setMemberPermissions(this.authenticatedUserId(req), targetUserId, body.permissions);
  }

  @Get('member-records/:userId')
  getMemberRecords(@Req() req: any, @Param('userId') targetUserId: string) {
    return this.familyService.getMemberRecords(this.authenticatedUserId(req), targetUserId);
  }

  @Delete('remove-member/:userId')
  removeMember(@Req() req: any, @Param('userId') targetUserId: string) {
    return this.familyService.removeMember(this.authenticatedUserId(req), targetUserId);
  }

  @Get('members')
  listMembers(@Req() req: any) {
    return this.familyService.listMembers(this.authenticatedUserId(req));
  }

  @Get('member-health/:userId')
  getMemberHealth(@Req() req: any, @Param('userId') targetUserId: string) {
    return this.familyService.getMemberHealth(this.authenticatedUserId(req), targetUserId);
  }

  @Get('emergency-contacts')
  emergencyContacts(@Req() req: any) {
    return this.familyService.getEmergencyContacts(this.authenticatedUserId(req));
  }

  // ── Shared Calendar ────────────────────────────────────────────────────────
  @Post('calendar/event')
  addEvent(@Req() req: any, @Body() body: any) {
    return this.familyService.addCalendarEvent(this.authenticatedUserId(req), body);
  }

  @Get('calendar')
  getCalendar(@Req() req: any) {
    return this.familyService.getCalendarEvents(this.authenticatedUserId(req));
  }

  @Delete('calendar/event/:eventId')
  deleteEvent(@Req() req: any, @Param('eventId') eventId: string) {
    return this.familyService.deleteCalendarEvent(this.authenticatedUserId(req), eventId);
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  @Post('permissions/request')
  requestPermissions(@Req() req: any, @Body() body: { target_member_id: string; permissions: string[] }) {
    return this.familyService.requestPermissions(this.authenticatedUserId(req), body.target_member_id, body.permissions);
  }

  @Get('permissions/pending')
  pendingRequests(@Req() req: any) {
    return this.familyService.getPendingPermissionRequests(this.authenticatedUserId(req));
  }

  @Put('permissions/respond/:requestId')
  respondPermission(
    @Req() req: any,
    @Param('requestId') requestId: string,
    @Body() body: { decision: 'approved' | 'rejected'; note?: string; permissions?: string[] },
  ) {
    return this.familyService.respondPermission(
      this.authenticatedUserId(req), requestId, body.decision, body.note, body.permissions,
    );
  }
}
