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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_bus_service_1 = require("../events/event-bus.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt = require('jsonwebtoken');
let ChatService = class ChatService {
    constructor(threads, msgs, bus, events) {
        this.threads = threads;
        this.msgs = msgs;
        this.bus = bus;
        this.events = events;
        this.logger = new common_1.Logger('ChatService');
    }
    async getOrCreateDirectThread(userA, userB) {
        const participants = [userA, userB].sort();
        let thread = await this.threads.findOne({ type: 'direct', participant_ids: { $all: participants, $size: 2 } });
        if (!thread) {
            thread = await this.threads.create({ type: 'direct', participant_ids: participants, created_by: userA, unread_counts: { [userA]: 0, [userB]: 0 } });
        }
        return thread.toObject();
    }
    async createGroupThread(creatorId, name, participantIds) {
        const all = [...new Set([creatorId, ...participantIds])];
        const counts = {};
        all.forEach(id => counts[id] = 0);
        const thread = await this.threads.create({ type: 'group', participant_ids: all, name, created_by: creatorId, unread_counts: counts });
        return thread.toObject();
    }
    async resolveBookingParties(bookingKind, bookingId) {
        const modelMap = {
            pharmacy: 'Order', lab: 'LabBooking', radiology: 'RadiologyBooking',
            nursing: 'HomeCareBooking', homecare: 'HomeCareBooking', consultation: 'Appointment',
            doctor: 'Appointment', ambulance: 'AmbulanceRequest',
        };
        const modelName = modelMap[(bookingKind || '').toLowerCase()];
        if (!modelName)
            return {};
        try {
            const m = this.getModel(modelName);
            let doc = await m.findOne({ id: bookingId }).lean();
            if (!doc && /^[a-f0-9]{24}$/i.test(bookingId))
                doc = await m.findById(bookingId).lean();
            if (!doc)
                return {};
            const patientId = doc.patient_id || doc.user_id || doc.patient_user_id || undefined;
            const providerId = doc.provider_account_id || doc.provider_id || doc.doctor_user_id || doc.pharmacy_id || undefined;
            return { patientId, providerId };
        }
        catch {
            return {};
        }
    }
    async getOrCreateBookingThread(bookingKind, bookingId, patientId, providerId) {
        let thread = await this.threads.findOne({ type: 'booking', booking_kind: bookingKind, booking_id: bookingId });
        const parties = await this.resolveBookingParties(bookingKind, bookingId);
        const wanted = [...new Set([patientId, providerId, parties.patientId, parties.providerId].filter(Boolean))];
        if (!thread) {
            const participants = wanted.length ? wanted : [patientId];
            const counts = {};
            participants.forEach(id => counts[id] = 0);
            thread = await this.threads.create({ type: 'booking', booking_kind: bookingKind, booking_id: bookingId, participant_ids: participants, created_by: patientId, unread_counts: counts });
        }
        else {
            const allowed = new Set([...wanted, patientId]);
            const missing = [...allowed].filter(id => !thread.participant_ids.includes(id));
            if (missing.length) {
                await this.threads.updateOne({ id: thread.id }, { $addToSet: { participant_ids: { $each: missing } }, $set: Object.fromEntries(missing.map(id => [`unread_counts.${id}`, 0])) });
                thread.participant_ids.push(...missing);
            }
        }
        return thread.toObject();
    }
    async myThreads(userId, page = 1, limit = 30) {
        const filter = { participant_ids: userId, is_active: true };
        const total = await this.threads.countDocuments(filter);
        const threads = await this.threads.find(filter, { _id: 0, __v: 0 }).sort({ last_message_at: -1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
        return { threads, total };
    }
    assertParticipant(thread, userId) {
        if (!thread.participant_ids.includes(userId))
            throw new common_1.NotFoundException('thread_not_found');
    }
    getModel(name) {
        return this.threads.db.model(name);
    }
    async issueRealtimeToken(threadId, user) {
        await this.getThread(threadId, user?.id);
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new common_1.ServiceUnavailableException('chat_rt_token_not_configured');
        return {
            token: jwt.sign({ sub: user.id, purpose: 'chat_rt', thread_id: threadId }, secret, { algorithm: 'HS256', audience: 'chat-rt', expiresIn: '10m' }),
            expires_in: 600,
        };
    }
    async validateChatMediaIds(threadId, senderId, mediaIds) {
        if (mediaIds === undefined)
            return [];
        if (!Array.isArray(mediaIds) || mediaIds.some((id) => typeof id !== 'string' || !id.trim())) {
            throw new common_1.BadRequestException('invalid_media_ids');
        }
        const uniqueIds = [...new Set(mediaIds.map((id) => id.trim()))];
        if (uniqueIds.length > 10)
            throw new common_1.BadRequestException('too_many_media_ids');
        if (!uniqueIds.length)
            return [];
        let MediaAssetModel;
        try {
            MediaAssetModel = this.getModel('MediaAsset');
        }
        catch {
            throw new common_1.ServiceUnavailableException('media_registry_not_available');
        }
        const assets = await MediaAssetModel.find({
            id: { $in: uniqueIds }, owner_id: senderId, purpose: 'chat', thread_id: threadId,
        }).lean();
        if (assets.length !== uniqueIds.length)
            throw new common_1.BadRequestException('media_not_owned_or_not_bound_to_thread');
        return uniqueIds;
    }
    async checkIfFamily(participantIds) {
        if (participantIds.length < 2)
            return false;
        const userA = participantIds[0];
        const userB = participantIds[1];
        try {
            const FamilyGroupModel = this.getModel('FamilyGroup');
            const count = await FamilyGroupModel.countDocuments({
                is_deleted: { $ne: true },
                'members.user_id': { $all: [userA, userB] }
            });
            return count > 0;
        }
        catch {
            return false;
        }
    }
    async verifyCommunicationAllowed(threadId, senderId) {
        const thread = await this.threads.findOne({ id: threadId });
        if (!thread)
            return { allowed: true };
        const isFamily = await this.checkIfFamily(thread.participant_ids);
        if (isFamily)
            return { allowed: true };
        if (thread.type === 'booking' && thread.booking_kind === 'consultation') {
            if (!thread.booking_id)
                return { allowed: false, message: 'معرف الحجز غير موجود.' };
            try {
                const AppointmentModel = this.getModel('Appointment');
                const appt = await AppointmentModel.findOne({ id: thread.booking_id });
                if (!appt)
                    return { allowed: false, message: 'لم يتم العثور على الاستشارة المرتبطة.' };
                if (appt.status === 'PENDING') {
                    return { allowed: false, message: 'لم تبدأ الاستشارة بعد. ستتمكن من التواصل مع الطبيب بمجرد تأكيد الحجز وبدء الموعد.' };
                }
                if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
                    return { allowed: false, message: 'انتهت فترة المتابعة الخاصة بالاستشارة.' };
                }
                if (appt.status === 'COMPLETED') {
                    const SystemConfigModel = this.getModel('SystemConfig');
                    const sysConfig = await SystemConfigModel.findOne({ key: 'system_config' });
                    const followupHours = sysConfig?.value?.consultation_followup_hours ?? 24;
                    const endedAt = appt.completed_at || appt.updatedAt || new Date();
                    const elapsedHours = (Date.now() - new Date(endedAt).getTime()) / (1000 * 60 * 60);
                    if (elapsedHours > followupHours) {
                        return { allowed: false, message: 'انتهت فترة المتابعة الخاصة بالاستشارة.' };
                    }
                }
            }
            catch (err) {
                this.logger.warn(`Appointment validation failed: ${err.message}`);
            }
        }
        return { allowed: true };
    }
    async sendMessage(threadId, senderId, senderRole, body) {
        const thread = await this.threads.findOne({ id: threadId });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, senderId);
        const check = await this.verifyCommunicationAllowed(threadId, senderId);
        if (!check.allowed)
            throw new common_1.ForbiddenException(check.message);
        const mediaIds = await this.validateChatMediaIds(threadId, senderId, body?.media_ids);
        if (body?.attachment_url)
            throw new common_1.BadRequestException('attachment_url_not_supported_use_media_ids');
        if (body.client_message_id) {
            const existing = await this.msgs.findOne({ client_message_id: body.client_message_id, thread_id: threadId, sender_id: senderId });
            if (existing) {
                return existing.toObject();
            }
        }
        if (!body?.body?.trim() && mediaIds.length === 0)
            throw new common_1.BadRequestException('empty_message');
        const msg = await this.msgs.create({
            thread_id: threadId,
            sender_id: senderId,
            sender_role: senderRole,
            body: body.body?.trim() || '',
            type: body.type || (mediaIds.length ? 'file' : 'text'),
            media_ids: mediaIds,
            attachment_url: undefined,
            attachment_mime: body.attachment_mime,
            attachment_name: body.attachment_name,
            attachment_size: body.attachment_size,
            duration_seconds: body.duration_seconds,
            reply_to_id: body.reply_to_id,
            forwarded_from_id: body.forwarded_from_id,
            client_message_id: body.client_message_id,
            read_by: [senderId],
            delivered_to: [senderId],
        });
        const unread = {};
        for (const pid of thread.participant_ids) {
            if (pid !== senderId)
                unread[`unread_counts.${pid}`] = (thread.unread_counts?.[pid] || 0) + 1;
        }
        await this.threads.updateOne({ id: threadId }, {
            $set: { last_message: (body.body || (mediaIds.length ? '[مرفق]' : '')).slice(0, 150), last_message_at: new Date(), last_message_sender_id: senderId, ...unread },
        });
        const chatPayload = {
            thread_id: threadId,
            msg_id: msg.id,
            body: (body.body || '').slice(0, 120),
            type: msg.type,
            media_ids: mediaIds,
            sender_id: senderId,
            participant_ids: thread.participant_ids,
            created_at: new Date(),
        };
        this.bus.emit({
            type: 'chat.message_sent',
            entity_type: 'chat_message',
            entity_id: msg.id,
            actor_account_id: senderId,
            actor_role: senderRole,
            patient_id: thread.participant_ids[0],
            meta: chatPayload,
        }).catch(() => null);
        this.events.emit('chat.message_sent', {
            ...chatPayload,
            actor_account_id: senderId,
            actor_role: senderRole,
            meta: chatPayload,
        });
        return msg.toObject();
    }
    async getMessages(threadId, userId, options) {
        const thread = await this.threads.findOne({ id: threadId });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, userId);
        const limit = options.limit || 50;
        const query = { thread_id: threadId, is_deleted: false };
        if (options.before) {
            const ref = await this.msgs.findOne({ id: options.before }).lean();
            if (ref)
                query.createdAt = { $lt: ref.createdAt };
        }
        if (options.search)
            query.$text = { $search: options.search };
        const messages = await this.msgs.find(query, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(limit + 1).lean();
        const has_more = messages.length > limit;
        return { messages: has_more ? messages.slice(0, limit) : messages, has_more };
    }
    async markRead(threadId, userId, upToMessageId) {
        const thread = await this.threads.findOne({ id: threadId });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, userId);
        const query = { thread_id: threadId, sender_id: { $ne: userId }, read_by: { $ne: userId } };
        if (upToMessageId) {
            const marker = await this.msgs.findOne({ id: upToMessageId, thread_id: threadId }).lean();
            if (!marker)
                throw new common_1.BadRequestException('invalid_up_to_message_id');
            query.createdAt = { $lte: marker.createdAt };
        }
        await this.msgs.updateMany(query, { $addToSet: { read_by: userId } });
        await this.threads.updateOne({ id: threadId }, { $set: { [`unread_counts.${userId}`]: 0 } });
    }
    async markDelivered(threadId, userId) {
        const thread = await this.threads.findOne({ id: threadId });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, userId);
        await this.msgs.updateMany({ thread_id: threadId, sender_id: { $ne: userId }, delivered_to: { $ne: userId } }, { $addToSet: { delivered_to: userId } });
    }
    async editMessage(msgId, userId, newBody) {
        const msg = await this.msgs.findOne({ id: msgId });
        if (!msg)
            throw new common_1.NotFoundException('message_not_found');
        if (msg.sender_id !== userId)
            throw new common_1.ForbiddenException('not_sender');
        if (msg.is_deleted)
            throw new common_1.BadRequestException('message_deleted');
        msg.body = newBody;
        msg.is_edited = true;
        msg.edited_at = new Date();
        await msg.save();
        return msg.toObject();
    }
    async deleteMessage(msgId, userId) {
        const msg = await this.msgs.findOne({ id: msgId });
        if (!msg)
            throw new common_1.NotFoundException('message_not_found');
        if (msg.sender_id !== userId)
            throw new common_1.ForbiddenException('not_sender');
        msg.is_deleted = true;
        msg.deleted_at = new Date();
        msg.body = '';
        await msg.save();
    }
    async addReaction(msgId, userId, emoji) {
        const msg = await this.msgs.findOne({ id: msgId });
        if (!msg)
            throw new common_1.NotFoundException('message_not_found');
        const thread = await this.threads.findOne({ id: msg.thread_id });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, userId);
        for (const [e, users] of Object.entries(msg.reactions || {})) {
            msg.reactions[e] = users.filter(u => u !== userId);
        }
        if (!msg.reactions[emoji])
            msg.reactions[emoji] = [];
        msg.reactions[emoji].push(userId);
        msg.markModified('reactions');
        await msg.save();
        return msg.toObject();
    }
    async removeReaction(msgId, userId, emoji) {
        const msg = await this.msgs.findOne({ id: msgId });
        if (!msg)
            throw new common_1.NotFoundException('message_not_found');
        const thread = await this.threads.findOne({ id: msg.thread_id });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, userId);
        if (msg.reactions?.[emoji]) {
            msg.reactions[emoji] = msg.reactions[emoji].filter(u => u !== userId);
            msg.markModified('reactions');
            await msg.save();
        }
        return msg.toObject();
    }
    async pinMessage(msgId, userId) {
        const msg = await this.msgs.findOne({ id: msgId });
        if (!msg)
            throw new common_1.NotFoundException('message_not_found');
        const thread = await this.threads.findOne({ id: msg.thread_id });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, userId);
        await this.msgs.updateOne({ id: msgId }, { $set: { is_pinned: true } });
    }
    async getThread(threadId, userId) {
        const thread = await this.threads.findOne({ id: threadId }, { _id: 0, __v: 0 }).lean();
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, userId);
        return thread;
    }
    async addParticipant(threadId, actorId, userId) {
        const thread = await this.threads.findOne({ id: threadId });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, actorId);
        if (thread.type !== 'group' && thread.type !== 'direct')
            throw new common_1.ForbiddenException('participant_management_not_allowed');
        await this.threads.updateOne({ id: threadId }, {
            $addToSet: { participant_ids: userId },
            $set: { [`unread_counts.${userId}`]: 0 },
        });
    }
    async removeParticipant(threadId, actorId, userId) {
        const thread = await this.threads.findOne({ id: threadId });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        this.assertParticipant(thread, actorId);
        if (thread.type !== 'group' && thread.type !== 'direct')
            throw new common_1.ForbiddenException('participant_management_not_allowed');
        await this.threads.updateOne({ id: threadId }, { $pull: { participant_ids: userId } });
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ChatThread')),
    __param(1, (0, mongoose_1.InjectModel)('ChatMessage')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService,
        event_emitter_1.EventEmitter2])
], ChatService);
//# sourceMappingURL=chat.service.js.map