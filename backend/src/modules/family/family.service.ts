// @ts-nocheck
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FamilyGroupRepository } from "./repositories/familygroup.repository";
import { SharedCalendarEventRepository } from "./repositories/sharedcalendarevent.repository";
import { FamilyPermissionRequestRepository } from "./repositories/familypermissionrequest.repository";

@Injectable()
export class FamilyService {
  constructor(
    @Inject('FamilyGroupRepository') private groupM: FamilyGroupRepository,
    @Inject('SharedCalendarEventRepository') private calendarM: SharedCalendarEventRepository,
    @Inject('FamilyPermissionRequestRepository') private permReqM: FamilyPermissionRequestRepository,
    @Optional() @Inject('NOTIFICATION_SERVICE') private notificationSvc?: any,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  // ── helpers ────────────────────────────────────────────────────────────────

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private async findGroupByOwnerOrMember(userId: string) {
    return this.groupM.findOne({
      is_deleted: { $ne: true },
      $or: [
        { owner_id: userId },
        { 'members.user_id': userId },
      ],
    }).lean();
  }

  private hasPermission(group: any, requesterId: string, permission: string): boolean {
    if (group.owner_id === requesterId) return true;
    const member = group.members?.find((m: any) => m.user_id === requesterId);
    return member?.permissions?.includes(permission) ?? false;
  }

  // ── Group Management ───────────────────────────────────────────────────────

  async createGroup(userId: string, name: string) {
    const existing = await this.findGroupByOwnerOrMember(userId);
    if (existing) {
      throw new BadRequestException('User already belongs to a family group');
    }
    const group = await this.groupM.create({
      id: uuidv4(),
      owner_id: userId,
      name,
      members: [{ user_id: userId, role: 'owner', permissions: ['*'], joined_at: new Date() }],
    });
    return { ok: true, group_id: group.id, name };
  }

  async getMyGroup(userId: string) {
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) throw new NotFoundException('No family group found');
    return group;
  }

  async generateInvite(userId: string) {
    const group = await this.groupM.findOne({ owner_id: userId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new NotFoundException('You must be the group owner');
    const code = this.generateInviteCode();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.groupM.updateOne({ id: (group as any).id }, { invite_code: code, invite_expires_at: expires });
    return { invite_code: code, expires_at: expires };
  }

  async joinGroup(userId: string, inviteCode: string, displayName?: string) {
    const group = await this.groupM.findOne({
      invite_code: inviteCode,
      is_deleted: { $ne: true },
      invite_expires_at: { $gt: new Date() },
    }).lean();
    if (!group) throw new BadRequestException('Invalid or expired invite code');
    const alreadyMember = (group as any).members?.some((m: any) => m.user_id === userId);
    if (alreadyMember) throw new BadRequestException('Already a member of this group');
    await this.groupM.updateOne(
      { id: (group as any).id },
      {
        $push: {
          members: { user_id: userId, role: 'member', permissions: [], joined_at: new Date(), display_name: displayName },
        },
      },
    );
    // Notify owner
    this.emitEvent('family.invite_accepted', { group_id: (group as any).id, owner_id: (group as any).owner_id, new_member_id: userId });
    return { ok: true, group_id: (group as any).id };
  }

  async removeMember(ownerId: string, targetUserId: string) {
    const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new ForbiddenException('Only the group owner can remove members');
    if (targetUserId === ownerId) throw new BadRequestException('Owner cannot remove themselves');
    await this.groupM.updateOne(
      { id: (group as any).id },
      { $pull: { members: { user_id: targetUserId } } },
    );
    return { ok: true };
  }

  async listMembers(userId: string) {
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) throw new NotFoundException('No family group found');
    return (group as any).members ?? [];
  }

  async getMemberHealth(requesterId: string, targetMemberId: string) {
    const group = await this.findGroupByOwnerOrMember(requesterId);
    if (!group) throw new NotFoundException('Not part of a family group');
    const canView = this.hasPermission(group, requesterId, 'view_health');
    if (!canView) throw new ForbiddenException('You do not have permission to view this member\'s health data');
    return await this.connection.model('MedicalProfile').findOne({ user_id: memberId }).lean();
  }

  async getEmergencyContacts(userId: string) {
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) return [];
    return (group as any).members?.map((m: any) => ({ user_id: m.user_id, display_name: m.display_name })) ?? [];
  }

  // ── Shared Calendar ────────────────────────────────────────────────────────

  async addCalendarEvent(userId: string, body: {
    title: string; description?: string; type?: string;
    ref_id?: string; event_date: Date; member_user_id: string;
  }) {
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) throw new NotFoundException('Not part of a family group');
    const event = await this.calendarM.create({
      id: uuidv4(),
      group_id: (group as any).id,
      created_by: userId,
      ...body,
    });
    return { ok: true, event_id: event.id };
  }

  async getCalendarEvents(userId: string) {
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) throw new NotFoundException('Not part of a family group');
    return this.calendarM.find({
      group_id: (group as any).id,
      is_deleted: { $ne: true },
    }).sort({ event_date: 1 }).lean();
  }

  async deleteCalendarEvent(userId: string, eventId: string) {
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) throw new NotFoundException('Not part of a family group');
    await this.calendarM.updateOne(
      { id: eventId, group_id: (group as any).id },
      { is_deleted: true },
    );
    return { ok: true };
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  async requestPermissions(requesterId: string, targetMemberId: string, permissions: string[]) {
    const group = await this.findGroupByOwnerOrMember(requesterId);
    if (!group) throw new NotFoundException('Not part of a family group');
    const req = await this.permReqM.create({
      id: uuidv4(),
      group_id: (group as any).id,
      requester_id: requesterId,
      target_member_id: targetMemberId,
      requested_permissions: permissions,
      status: 'pending',
    });
    // Notify group owner
    this.emitEvent('family.permission_requested', {
      group_id: (group as any).id,
      owner_id: (group as any).owner_id,
      requester_id: requesterId,
      request_id: req.id,
    });
    return { ok: true, request_id: req.id };
  }

  async respondPermission(ownerId: string, requestId: string, decision: 'approved' | 'rejected', note?: string) {
    const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new ForbiddenException('Only group owner can respond to permission requests');
    const req: any = await this.permReqM.findOne({ id: requestId, group_id: (group as any).id }).lean();
    if (!req) throw new NotFoundException('Permission request not found');
    await this.permReqM.updateOne({ id: requestId }, { status: decision, responded_at: new Date(), response_note: note });
    if (decision === 'approved') {
      // Grant permissions to the requester in the group's members array
      await this.groupM.updateOne(
        { id: (group as any).id, 'members.user_id': req.requester_id },
        { $addToSet: { 'members.$.permissions': { $each: req.requested_permissions } } },
      );
    }
    this.emitEvent('family.permission_responded', {
      group_id: (group as any).id,
      requester_id: req.requester_id,
      decision,
    });
    return { ok: true, decision };
  }

  async getPendingPermissionRequests(ownerId: string) {
    const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new NotFoundException('No group found');
    return this.permReqM.find({ group_id: (group as any).id, status: 'pending' }).lean();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private emitEvent(event: string, payload: any) {
    try {
      this.eventEmitter?.emit(event, payload);
    } catch { /* silent */ }
  }
}
