import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection } from '@nestjs/mongoose';
import { FamilyGroupRepository } from "./repositories/familygroup.repository";
import { SharedCalendarEventRepository } from "./repositories/sharedcalendarevent.repository";
import { FamilyPermissionRequestRepository } from "./repositories/familypermissionrequest.repository";

/** Permission keys a family member can hold — matches the patient app's matrix. */
const ALLOWED_MEMBER_PERMISSIONS = [
  'vitals', 'meds', 'reports', 'appointments', 'booking',
  'pharmacy', 'payment', 'location', 'emergency', 'view_health',
];

@Injectable()
export class FamilyService {
  constructor(
    @InjectConnection() private connection: Connection,
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

  async joinGroup(userId: string, inviteCode: string, displayName?: string, relation?: string) {
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
          members: {
            user_id: userId,
            role: 'member',
            permissions: [],
            joined_at: new Date(),
            display_name: displayName,
            relation: relation?.trim()?.slice(0, 40) || null,
          },
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
    // Accept the granular permission keys the patient app actually grants
    // (vitals/meds/reports/appointments/emergency) plus legacy view_health.
    const HEALTH_KEYS = ['view_health', 'vitals', 'meds', 'reports', 'appointments', 'emergency'];
    const canView = HEALTH_KEYS.some((k) => this.hasPermission(group, requesterId, k));
    if (!canView) throw new ForbiddenException('You do not have permission to view this member\'s health data');
    // MedicalProfile is keyed by patient_id (not user_id)
    return await this.connection.model('MedicalProfile').findOne({ patient_id: targetMemberId }).lean();
  }

  /**
   * GET /family/member-records/:userId — granular, permission-filtered record
   * bundle. Each section is present ONLY when the requester holds the matching
   * permission; nothing is fabricated for missing sections.
   */
  async getMemberRecords(requesterId: string, targetMemberId: string) {
    const group = await this.findGroupByOwnerOrMember(requesterId);
    if (!group) throw new NotFoundException('Not part of a family group');
    const isMember = (group as any).members?.some((m: any) => m.user_id === targetMemberId);
    if (!isMember) throw new NotFoundException('Member not found in your family group');

    const can = (key: string) => this.hasPermission(group, requesterId, key);
    const out: any = { user_id: targetMemberId, granted: (group as any).members?.find((m: any) => m.user_id === requesterId)?.permissions ?? (group.owner_id === requesterId ? ['*'] : []) };

    const jobs: Promise<void>[] = [];

    if (can('vitals')) {
      jobs.push(this.connection.db.collection('vitalreadings')
        .find({ patient_id: targetMemberId }, { projection: { _id: 0, id: 1, type: 1, value: 1, unit: 1, measured_at: 1, context: 1 } })
        .sort({ measured_at: -1 }).limit(50).toArray()
        .then((r) => { out.vitals = r; }).catch(() => { out.vitals = []; }));
    }
    if (can('meds')) {
      jobs.push(Promise.all([
        this.connection.db.collection('medicationreminders')
          .find({ patient_id: targetMemberId, active: true }, { projection: { _id: 0, id: 1, medicine_name_ar: 1, medicine_name_en: 1, dose: 1, frequency: 1, times: 1 } })
          .sort({ createdAt: -1 }).limit(30).toArray().catch(() => []),
        this.connection.db.collection('prescriptions')
          .find({ patient_id: targetMemberId, state: { $nin: ['DISPENSED', 'ARCHIVED'] } }, { projection: { _id: 0, id: 1, items: 1, state: 1, createdAt: 1, doctor_name: 1 } })
          .sort({ createdAt: -1 }).limit(30).toArray().catch(() => []),
      ]).then(([reminders, prescriptions]) => { out.meds = reminders; out.prescriptions = prescriptions; }));
    }
    if (can('reports')) {
      jobs.push(Promise.all([
        this.connection.db.collection('labbookings')
          .find({ patient_id: targetMemberId }, { projection: { _id: 0, id: 1, tests: 1, status: 1, createdAt: 1, results: 1 } })
          .sort({ createdAt: -1 }).limit(20).toArray().catch(() => []),
        this.connection.db.collection('radiologybookings')
          .find({ patient_id: targetMemberId }, { projection: { _id: 0, id: 1, exam_type: 1, status: 1, createdAt: 1, report_status: 1 } })
          .sort({ createdAt: -1 }).limit(20).toArray().catch(() => []),
      ]).then(([labs, rads]) => { out.reports = { lab: labs, radiology: rads }; }));
    }
    if (can('appointments')) {
      jobs.push(this.connection.db.collection('appointments')
        .find({ patient_id: targetMemberId }, { projection: { _id: 0, id: 1, doctor_name: 1, specialty: 1, scheduled_at: 1, status: 1, type: 1 } })
        .sort({ scheduled_at: -1 }).limit(30).toArray()
        .then((r) => {
          out.appointments = r;
          const now = new Date();
          out.next_appointment = r.find((a: any) => a.scheduled_at && new Date(a.scheduled_at) > now && !['cancelled', 'CANCELLED', 'completed', 'COMPLETED'].includes(a.status)) || null;
        }).catch(() => { out.appointments = []; out.next_appointment = null; }));
    }
    if (can('emergency')) {
      jobs.push(this.connection.model('MedicalProfile').findOne({ patient_id: targetMemberId })
        .select('blood_type allergies chronic_diseases emergency_contact -_id').lean()
        .then((r) => { out.emergency_card = r || null; }).catch(() => { out.emergency_card = null; }));
    }

    if (jobs.length === 0) {
      throw new ForbiddenException('You do not have permission to view this member\'s records');
    }
    // Profile basics (age/gender/blood type) ride along with any health grant
    jobs.push(this.connection.model('MedicalProfile').findOne({ patient_id: targetMemberId })
      .select('birth_date gender blood_type -_id').lean()
      .then((r) => { out.profile = r || null; }).catch(() => { out.profile = null; }));
    await Promise.all(jobs);
    return out;
  }

  /** Owner sets a member's relationship label (parent/spouse/child/caregiver/…) */
  async updateMemberRelation(ownerId: string, targetUserId: string, relation: string) {
    if (!relation?.trim()) throw new BadRequestException('relation is required');
    const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new ForbiddenException('Only the group owner can edit members');
    const res = await this.groupM.updateOne(
      { id: (group as any).id, 'members.user_id': targetUserId },
      { $set: { 'members.$.relation': relation.trim().slice(0, 40) } },
    );
    const matched = (res as any)?.matchedCount ?? (res as any)?.nMatched;
    if (matched === 0) throw new NotFoundException('Member not found');
    return { ok: true };
  }

  /**
   * Owner replaces a member's permission set (grant AND revoke in one call).
   * Unknown keys are discarded — only the allow-list is ever stored.
   */
  async setMemberPermissions(ownerId: string, targetUserId: string, permissions: string[]) {
    const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new ForbiddenException('Only the group owner can edit permissions');
    if (targetUserId === ownerId) throw new BadRequestException('Owner permissions cannot be modified');
    const clean = (Array.isArray(permissions) ? permissions : [])
      .filter((p) => ALLOWED_MEMBER_PERMISSIONS.includes(p));
    const res = await this.groupM.updateOne(
      { id: (group as any).id, 'members.user_id': targetUserId },
      { $set: { 'members.$.permissions': clean } },
    );
    const matched = (res as any)?.matchedCount ?? (res as any)?.nMatched;
    if (matched === 0) throw new NotFoundException('Member not found');
    this.emitEvent('family.permissions_updated', { group_id: (group as any).id, member_id: targetUserId, permissions: clean });
    return { ok: true, permissions: clean };
  }

  /** A non-owner member leaves their group. */
  async leaveGroup(userId: string) {
    const group = await this.groupM.findOne({ 'members.user_id': userId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new NotFoundException('No family group found');
    if ((group as any).owner_id === userId) {
      throw new BadRequestException('Owner cannot leave — remove members or delete the group instead');
    }
    await this.groupM.updateOne({ id: (group as any).id }, { $pull: { members: { user_id: userId } } });
    return { ok: true };
  }

  async getEmergencyContacts(userId: string) {
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) return [];
    const members = ((group as any).members ?? []).filter((m: any) => m.user_id !== userId);
    if (members.length === 0) return [];
    // Enrich with phone so the SOS screen can actually place calls
    const ids = members.map((m: any) => m.user_id);
    const users = await this.connection.db.collection('users')
      .find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, phone: 1, full_name: 1 } })
      .toArray();
    const byId = new Map(users.map((u: any) => [u.id, u]));
    return members.map((m: any) => ({
      user_id: m.user_id,
      display_name: m.display_name || (byId.get(m.user_id) as any)?.full_name || null,
      phone: (byId.get(m.user_id) as any)?.phone || null,
      relation: m.relation || null,
    }));
  }

  // ── Shared Calendar ────────────────────────────────────────────────────────

  async addCalendarEvent(userId: string, body: {
    title: string; description?: string; type?: string;
    ref_id?: string; event_date?: Date; member_user_id?: string;
    member?: string; time?: string; color?: string;
  }) {
    if (!body?.title?.trim()) throw new BadRequestException('title is required');
    const group = await this.findGroupByOwnerOrMember(userId);
    if (!group) throw new NotFoundException('Not part of a family group');
    // Accept both the strict shape (member_user_id + event_date) and the app's
    // display shape (member name + time string) without ever 500-ing.
    const event = await this.calendarM.create({
      id: uuidv4(),
      group_id: (group as any).id,
      created_by: userId,
      title: body.title.trim(),
      description: body.description || null,
      type: body.type || 'appointment',
      ref_id: body.ref_id || null,
      event_date: body.event_date ? new Date(body.event_date) : new Date(),
      member_user_id: body.member_user_id || userId,
      member_name: body.member || null,
      time_label: body.time || null,
      color: body.color || null,
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
    const clean = (Array.isArray(permissions) ? permissions : [])
      .filter((p) => ALLOWED_MEMBER_PERMISSIONS.includes(p));
    if (clean.length === 0) throw new BadRequestException('No valid permissions requested');
    const req = await this.permReqM.create({
      id: uuidv4(),
      group_id: (group as any).id,
      requester_id: requesterId,
      target_member_id: targetMemberId,
      requested_permissions: clean,
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

  async respondPermission(ownerId: string, requestId: string, decision: 'approved' | 'rejected', note?: string, permissions?: string[]) {
    const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
    if (!group) throw new ForbiddenException('Only group owner can respond to permission requests');
    const req: any = await this.permReqM.findOne({ id: requestId, group_id: (group as any).id }).lean();
    if (!req) throw new NotFoundException('Permission request not found');
    await this.permReqM.updateOne({ id: requestId }, { status: decision, responded_at: new Date(), response_note: note });
    if (decision === 'approved') {
      // Grant the approved subset (owner may trim) — never more than requested
      const requested: string[] = req.requested_permissions || [];
      const grant = Array.isArray(permissions) && permissions.length > 0
        ? requested.filter((perm) => permissions.includes(perm))
        : requested;
      if (grant.length > 0) {
        await this.groupM.updateOne(
          { id: (group as any).id, 'members.user_id': req.requester_id },
          { $addToSet: { 'members.$.permissions': { $each: grant } } },
        );
      }
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
