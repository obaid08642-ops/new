"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const event_emitter_1 = require("@nestjs/event-emitter");
const mongoose_2 = require("@nestjs/mongoose");
const familygroup_repository_1 = require("./repositories/familygroup.repository");
const sharedcalendarevent_repository_1 = require("./repositories/sharedcalendarevent.repository");
const familypermissionrequest_repository_1 = require("./repositories/familypermissionrequest.repository");
const ALLOWED_MEMBER_PERMISSIONS = [
    'vitals', 'meds', 'reports', 'appointments', 'booking',
    'pharmacy', 'payment', 'location', 'emergency', 'view_health', 'book_for',
];
let FamilyService = class FamilyService {
    constructor(connection, groupM, calendarM, permReqM, notificationSvc, eventEmitter) {
        this.connection = connection;
        this.groupM = groupM;
        this.calendarM = calendarM;
        this.permReqM = permReqM;
        this.notificationSvc = notificationSvc;
        this.eventEmitter = eventEmitter;
    }
    generateInviteCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    async findGroupByOwnerOrMember(userId) {
        return this.groupM.findOne({
            is_deleted: { $ne: true },
            $or: [
                { owner_id: userId },
                { 'members.user_id': userId },
            ],
        }).lean();
    }
    hasPermission(group, requesterId, permission) {
        if (group.owner_id === requesterId)
            return true;
        const member = group.members?.find((m) => m.user_id === requesterId);
        return member?.permissions?.includes(permission) ?? false;
    }
    async createGroup(userId, name) {
        const existing = await this.findGroupByOwnerOrMember(userId);
        if (existing) {
            throw new common_1.BadRequestException('User already belongs to a family group');
        }
        const group = await this.groupM.create({
            id: (0, uuid_1.v4)(),
            owner_id: userId,
            name,
            members: [{ user_id: userId, role: 'owner', permissions: ['*'], joined_at: new Date() }],
        });
        return { ok: true, group_id: group.id, name };
    }
    async getMyGroup(userId) {
        const group = await this.findGroupByOwnerOrMember(userId);
        if (!group)
            throw new common_1.NotFoundException('No family group found');
        return group;
    }
    async generateInvite(userId) {
        const group = await this.groupM.findOne({ owner_id: userId, is_deleted: { $ne: true } }).lean();
        if (!group)
            throw new common_1.NotFoundException('You must be the group owner');
        const code = this.generateInviteCode();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.groupM.updateOne({ id: group.id }, { invite_code: code, invite_expires_at: expires });
        return { invite_code: code, expires_at: expires };
    }
    async sendInvite(userId, channel, target) {
        if (!['sms', 'email'].includes(channel))
            throw new common_1.BadRequestException('invalid_invite_channel');
        const destination = String(target || '').trim();
        if (!destination || destination.length > 254)
            throw new common_1.BadRequestException('invalid_invite_target');
        const generated = await this.generateInvite(userId);
        if (!this.notificationSvc?.send) {
            throw new common_1.ServiceUnavailableException('family_invite_delivery_unavailable');
        }
        await this.notificationSvc.send({
            channel,
            target: destination,
            template: 'family_invite',
            variables: { invite_code: generated.invite_code, expires_in: 86400 },
        });
        return { invite_sent: true, expires_in: 86400 };
    }
    async listMembersContract(userId) {
        const members = await this.listMembers(userId);
        return {
            members: members.map((member) => ({
                display_name: member.display_name || null,
                role: member.role,
                joined_at: member.joined_at || null,
            })),
        };
    }
    async joinGroup(userId, inviteCode, displayName, relation) {
        const group = await this.groupM.findOne({
            invite_code: String(inviteCode || '').trim(),
            is_deleted: { $ne: true },
        }).lean();
        if (!group)
            throw new common_1.BadRequestException('invalid_invite_code');
        if (!group.invite_expires_at || new Date(group.invite_expires_at).getTime() <= Date.now()) {
            throw new common_1.GoneException('invite_expired');
        }
        const alreadyMember = group.members?.some((m) => m.user_id === userId);
        if (alreadyMember)
            throw new common_1.ConflictException('already_member');
        await this.groupM.updateOne({ id: group.id }, {
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
        });
        this.emitEvent('family.invite_accepted', { group_id: group.id, owner_id: group.owner_id, new_member_id: userId });
        return { ok: true, group_id: group.id };
    }
    async removeMember(ownerId, targetUserId) {
        const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
        if (!group)
            throw new common_1.ForbiddenException('Only the group owner can remove members');
        if (targetUserId === ownerId)
            throw new common_1.BadRequestException('Owner cannot remove themselves');
        await this.groupM.updateOne({ id: group.id }, { $pull: { members: { user_id: targetUserId } } });
        return { ok: true };
    }
    async listMembers(userId) {
        const group = await this.findGroupByOwnerOrMember(userId);
        if (!group)
            throw new common_1.NotFoundException('No family group found');
        return group.members ?? [];
    }
    async getMemberHealth(requesterId, targetMemberId) {
        const group = await this.findGroupByOwnerOrMember(requesterId);
        if (!group)
            throw new common_1.NotFoundException('Not part of a family group');
        const HEALTH_KEYS = ['view_health', 'vitals', 'meds', 'reports', 'appointments', 'emergency'];
        const canView = HEALTH_KEYS.some((k) => this.hasPermission(group, requesterId, k));
        if (!canView)
            throw new common_1.ForbiddenException('You do not have permission to view this member\'s health data');
        return await this.connection.model('MedicalProfile').findOne({ patient_id: targetMemberId }).lean();
    }
    async getMemberRecords(requesterId, targetMemberId) {
        const group = await this.findGroupByOwnerOrMember(requesterId);
        if (!group)
            throw new common_1.NotFoundException('Not part of a family group');
        const isMember = group.members?.some((m) => m.user_id === targetMemberId);
        if (!isMember)
            throw new common_1.NotFoundException('Member not found in your family group');
        const can = (key) => this.hasPermission(group, requesterId, key);
        const out = { user_id: targetMemberId, granted: group.members?.find((m) => m.user_id === requesterId)?.permissions ?? (group.owner_id === requesterId ? ['*'] : []) };
        const jobs = [];
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
                out.next_appointment = r.find((a) => a.scheduled_at && new Date(a.scheduled_at) > now && !['cancelled', 'CANCELLED', 'completed', 'COMPLETED'].includes(a.status)) || null;
            }).catch(() => { out.appointments = []; out.next_appointment = null; }));
        }
        if (can('emergency')) {
            jobs.push(this.connection.model('MedicalProfile').findOne({ patient_id: targetMemberId })
                .select('blood_type allergies chronic_diseases emergency_contact -_id').lean()
                .then((r) => { out.emergency_card = r || null; }).catch(() => { out.emergency_card = null; }));
        }
        if (jobs.length === 0) {
            throw new common_1.ForbiddenException('You do not have permission to view this member\'s records');
        }
        jobs.push(this.connection.model('MedicalProfile').findOne({ patient_id: targetMemberId })
            .select('birth_date gender blood_type -_id').lean()
            .then((r) => { out.profile = r || null; }).catch(() => { out.profile = null; }));
        await Promise.all(jobs);
        return out;
    }
    async updateMemberRelation(ownerId, targetUserId, relation) {
        if (!relation?.trim())
            throw new common_1.BadRequestException('relation is required');
        const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
        if (!group)
            throw new common_1.ForbiddenException('Only the group owner can edit members');
        const res = await this.groupM.updateOne({ id: group.id, 'members.user_id': targetUserId }, { $set: { 'members.$.relation': relation.trim().slice(0, 40) } });
        const matched = res?.matchedCount ?? res?.nMatched;
        if (matched === 0)
            throw new common_1.NotFoundException('Member not found');
        return { ok: true };
    }
    async setMemberPermissions(ownerId, targetUserId, permissions) {
        const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
        if (!group)
            throw new common_1.ForbiddenException('Only the group owner can edit permissions');
        if (targetUserId === ownerId)
            throw new common_1.BadRequestException('Owner permissions cannot be modified');
        const clean = (Array.isArray(permissions) ? permissions : [])
            .filter((p) => ALLOWED_MEMBER_PERMISSIONS.includes(p));
        const res = await this.groupM.updateOne({ id: group.id, 'members.user_id': targetUserId }, { $set: { 'members.$.permissions': clean } });
        const matched = res?.matchedCount ?? res?.nMatched;
        if (matched === 0)
            throw new common_1.NotFoundException('Member not found');
        this.emitEvent('family.permissions_updated', { group_id: group.id, member_id: targetUserId, permissions: clean });
        return { ok: true, permissions: clean };
    }
    async leaveGroup(userId) {
        const group = await this.groupM.findOne({ 'members.user_id': userId, is_deleted: { $ne: true } }).lean();
        if (!group)
            throw new common_1.NotFoundException('No family group found');
        if (group.owner_id === userId) {
            throw new common_1.BadRequestException('Owner cannot leave — remove members or delete the group instead');
        }
        await this.groupM.updateOne({ id: group.id }, { $pull: { members: { user_id: userId } } });
        return { ok: true };
    }
    async getEmergencyContacts(userId) {
        const group = await this.findGroupByOwnerOrMember(userId);
        if (!group)
            return [];
        const members = (group.members ?? []).filter((m) => m.user_id !== userId);
        if (members.length === 0)
            return [];
        const ids = members.map((m) => m.user_id);
        const users = await this.connection.db.collection('users')
            .find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, phone: 1, full_name: 1 } })
            .toArray();
        const byId = new Map(users.map((u) => [u.id, u]));
        return members.map((m) => ({
            user_id: m.user_id,
            display_name: m.display_name || byId.get(m.user_id)?.full_name || null,
            phone: byId.get(m.user_id)?.phone || null,
            relation: m.relation || null,
        }));
    }
    async addCalendarEvent(userId, body) {
        if (!body?.title?.trim())
            throw new common_1.BadRequestException('title is required');
        const group = await this.findGroupByOwnerOrMember(userId);
        if (!group)
            throw new common_1.NotFoundException('Not part of a family group');
        const eventDate = body.event_date ? new Date(body.event_date) : null;
        if (!eventDate || Number.isNaN(eventDate.getTime()))
            throw new common_1.BadRequestException('valid event_date is required');
        const memberId = String(body.member_user_id || '').trim();
        if (!memberId)
            throw new common_1.BadRequestException('member_user_id is required');
        const members = Array.isArray(group.members) ? group.members : [];
        const member = members.find((candidate) => candidate?.user_id === memberId);
        if (memberId !== group.owner_id && !member)
            throw new common_1.NotFoundException('Member not found in your family group');
        const type = String(body.type || '').trim();
        if (!['appointment', 'order', 'lab', 'reminder', 'medication'].includes(type)) {
            throw new common_1.BadRequestException('valid calendar event type is required');
        }
        const event = await this.calendarM.create({
            id: (0, uuid_1.v4)(),
            group_id: group.id,
            created_by: userId,
            title: body.title.trim(),
            description: body.description || null,
            type,
            ref_id: body.ref_id || null,
            event_date: eventDate,
            member_user_id: memberId,
            member_name: member?.display_name || null,
            time_label: body.time || null,
            color: body.color || null,
        });
        return { ok: true, event_id: event.id };
    }
    async getCalendarEvents(userId) {
        const group = await this.findGroupByOwnerOrMember(userId);
        if (!group)
            throw new common_1.NotFoundException('Not part of a family group');
        const events = await this.calendarM.find({
            group_id: group.id,
            is_deleted: { $ne: true },
        }).sort({ event_date: 1 }).lean();
        return events.map((event) => ({
            ...event,
            can_delete: group.owner_id === userId || event.created_by === userId,
        }));
    }
    async deleteCalendarEvent(userId, eventId) {
        const group = await this.findGroupByOwnerOrMember(userId);
        if (!group)
            throw new common_1.NotFoundException('Not part of a family group');
        const event = await this.calendarM.findOne({ id: eventId, group_id: group.id, is_deleted: { $ne: true } }).lean();
        if (!event)
            throw new common_1.NotFoundException('Calendar event not found');
        if (group.owner_id !== userId && event.created_by !== userId) {
            throw new common_1.ForbiddenException('Only the event creator or group owner can delete this event');
        }
        const result = await this.calendarM.updateOne({ id: eventId, group_id: group.id, is_deleted: { $ne: true } }, { is_deleted: true });
        if (result?.matchedCount === 0 || result?.nMatched === 0)
            throw new common_1.NotFoundException('Calendar event not found');
        return { ok: true };
    }
    async requestPermissions(requesterId, targetMemberId, permissions) {
        const group = await this.findGroupByOwnerOrMember(requesterId);
        if (!group)
            throw new common_1.NotFoundException('Not part of a family group');
        const clean = (Array.isArray(permissions) ? permissions : [])
            .filter((p) => ALLOWED_MEMBER_PERMISSIONS.includes(p));
        if (clean.length === 0)
            throw new common_1.BadRequestException('No valid permissions requested');
        const req = await this.permReqM.create({
            id: (0, uuid_1.v4)(),
            group_id: group.id,
            requester_id: requesterId,
            target_member_id: targetMemberId,
            requested_permissions: clean,
            status: 'pending',
        });
        this.emitEvent('family.permission_requested', {
            group_id: group.id,
            owner_id: group.owner_id,
            requester_id: requesterId,
            request_id: req.id,
        });
        return { ok: true, request_id: req.id };
    }
    async respondPermission(ownerId, requestId, decision, note, permissions) {
        const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
        if (!group)
            throw new common_1.ForbiddenException('Only group owner can respond to permission requests');
        const req = await this.permReqM.findOne({ id: requestId, group_id: group.id }).lean();
        if (!req)
            throw new common_1.NotFoundException('Permission request not found');
        await this.permReqM.updateOne({ id: requestId }, { status: decision, responded_at: new Date(), response_note: note });
        if (decision === 'approved') {
            const requested = req.requested_permissions || [];
            const grant = Array.isArray(permissions) && permissions.length > 0
                ? requested.filter((perm) => permissions.includes(perm))
                : requested;
            if (grant.length > 0) {
                await this.groupM.updateOne({ id: group.id, 'members.user_id': req.requester_id }, { $addToSet: { 'members.$.permissions': { $each: grant } } });
            }
        }
        this.emitEvent('family.permission_responded', {
            group_id: group.id,
            requester_id: req.requester_id,
            decision,
        });
        return { ok: true, decision };
    }
    async getPendingPermissionRequests(ownerId) {
        const group = await this.groupM.findOne({ owner_id: ownerId, is_deleted: { $ne: true } }).lean();
        if (!group)
            throw new common_1.NotFoundException('No group found');
        return this.permReqM.find({ group_id: group.id, status: 'pending' }).lean();
    }
    emitEvent(event, payload) {
        try {
            this.eventEmitter?.emit(event, payload);
        }
        catch { }
    }
};
exports.FamilyService = FamilyService;
exports.FamilyService = FamilyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_2.InjectConnection)()),
    __param(1, (0, common_1.Inject)('FamilyGroupRepository')),
    __param(2, (0, common_1.Inject)('SharedCalendarEventRepository')),
    __param(3, (0, common_1.Inject)('FamilyPermissionRequestRepository')),
    __param(4, (0, common_1.Optional)()),
    __param(4, (0, common_1.Inject)('NOTIFICATION_SERVICE')),
    __param(5, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_1.Connection,
        familygroup_repository_1.FamilyGroupRepository,
        sharedcalendarevent_repository_1.SharedCalendarEventRepository,
        familypermissionrequest_repository_1.FamilyPermissionRequestRepository, Object, event_emitter_1.EventEmitter2])
], FamilyService);
//# sourceMappingURL=family.service.js.map