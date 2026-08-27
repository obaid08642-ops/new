import { Injectable, ForbiddenException, BadRequestException, NotFoundException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventBusService } from '../events/event-bus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatThread, ChatThreadDocument, ChatMessage, ChatMessageDocument } from './chat.schemas';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ChatService {
  private readonly logger = new Logger('ChatService');

  constructor(
    @InjectModel('ChatThread') public readonly threads: Model<ChatThreadDocument>,
    @InjectModel('ChatMessage') private readonly msgs: Model<ChatMessageDocument>,
    private readonly bus: EventBusService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Thread management ────────────────────────────────────────

  async getOrCreateDirectThread(userA: string, userB: string): Promise<ChatThread> {
    const participants = [userA, userB].sort();
    let thread = await this.threads.findOne({ type: 'direct', participant_ids: { $all: participants, $size: 2 } });
    if (!thread) {
      thread = await this.threads.create({ type: 'direct', participant_ids: participants, created_by: userA, unread_counts: { [userA]: 0, [userB]: 0 } });
    }
    return thread.toObject();
  }

  async createGroupThread(creatorId: string, name: string, participantIds: string[]): Promise<ChatThread> {
    const all = [...new Set([creatorId, ...participantIds])];
    const counts: Record<string, number> = {};
    all.forEach(id => counts[id] = 0);
    const thread = await this.threads.create({ type: 'group', participant_ids: all, name, created_by: creatorId, unread_counts: counts });
    return thread.toObject();
  }

  // Resolve the real patient/provider user ids behind a booking so a chat
  // thread always includes BOTH parties — regardless of which side opens the
  // chat first (previously a provider opening the chat first created a thread
  // containing only the provider, and the patient could never join).
  private async resolveBookingParties(bookingKind: string, bookingId: string): Promise<{ patientId?: string; providerId?: string }> {
    const modelMap: Record<string, string> = {
      pharmacy: 'Order', lab: 'LabBooking', radiology: 'RadiologyBooking',
      nursing: 'HomeCareBooking', homecare: 'HomeCareBooking', consultation: 'Appointment',
      doctor: 'Appointment', ambulance: 'AmbulanceRequest',
    };
    const modelName = modelMap[(bookingKind || '').toLowerCase()];
    if (!modelName) return {};
    try {
      const m = this.getModel(modelName);
      let doc: any = await m.findOne({ id: bookingId }).lean();
      if (!doc && /^[a-f0-9]{24}$/i.test(bookingId)) doc = await m.findById(bookingId).lean();
      if (!doc) return {};
      const patientId = doc.patient_id || doc.user_id || doc.patient_user_id || undefined;
      const providerId = doc.provider_account_id || doc.provider_id || doc.doctor_user_id || doc.pharmacy_id || undefined;
      return { patientId, providerId };
    } catch {
      return {}; // model not registered in this context — stay permissive (legacy behaviour)
    }
  }

  async getOrCreateBookingThread(bookingKind: string, bookingId: string, patientId: string, providerId?: string): Promise<ChatThread> {
    let thread = await this.threads.findOne({ type: 'booking', booking_kind: bookingKind, booking_id: bookingId });
    const parties = await this.resolveBookingParties(bookingKind, bookingId);
    const wanted = [...new Set([patientId, providerId, parties.patientId, parties.providerId].filter(Boolean) as string[])];
    if (!thread) {
      const participants = wanted.length ? wanted : [patientId];
      const counts: Record<string, number> = {};
      participants.forEach(id => counts[id] = 0);
      thread = await this.threads.create({ type: 'booking', booking_kind: bookingKind, booking_id: bookingId, participant_ids: participants, created_by: patientId, unread_counts: counts });
    } else {
      // Lazily attach resolved parties / the caller to an existing thread.
      // Only ids tied to the booking document itself are auto-joined, which
      // keeps this safe against arbitrary thread-join (IDOR) attempts.
      const allowed = new Set([...wanted, patientId]);
      const missing = [...allowed].filter(id => !thread.participant_ids.includes(id));
      if (missing.length) {
        await this.threads.updateOne(
          { id: thread.id },
          { $addToSet: { participant_ids: { $each: missing } }, $set: Object.fromEntries(missing.map(id => [`unread_counts.${id}`, 0])) },
        );
        thread.participant_ids.push(...missing);
      }
    }
    return thread.toObject();
  }

  async myThreads(userId: string, page = 1, limit = 30): Promise<{ threads: ChatThread[]; total: number }> {
    const filter = { participant_ids: userId, is_active: true };
    const total = await this.threads.countDocuments(filter);
    const threads = await this.threads.find(filter, { _id: 0, __v: 0 }).sort({ last_message_at: -1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return { threads, total };
  }

  private assertParticipant(thread: any, userId: string): void {
    // Do not reveal that a thread exists to a non-participant.
    if (!thread.participant_ids.includes(userId)) throw new NotFoundException('thread_not_found');
  }

  getModel(name: string): Model<any> {
    return this.threads.db.model(name);
  }

  async issueRealtimeToken(threadId: string, user: any): Promise<{ token: string; expires_in: number }> {
    await this.getThread(threadId, user?.id);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new ServiceUnavailableException('chat_rt_token_not_configured');
    return {
      token: jwt.sign(
        { sub: user.id, purpose: 'chat_rt', thread_id: threadId },
        secret,
        { algorithm: 'HS256', audience: 'chat-rt', expiresIn: '10m' },
      ),
      expires_in: 600,
    };
  }

  private async validateChatMediaIds(threadId: string, senderId: string, mediaIds?: unknown): Promise<string[]> {
    if (mediaIds === undefined) return [];
    if (!Array.isArray(mediaIds) || mediaIds.some((id) => typeof id !== 'string' || !id.trim())) {
      throw new BadRequestException('invalid_media_ids');
    }
    const uniqueIds = [...new Set(mediaIds.map((id) => id.trim()))];
    if (uniqueIds.length > 10) throw new BadRequestException('too_many_media_ids');
    if (!uniqueIds.length) return [];

    let MediaAssetModel: Model<any>;
    try {
      MediaAssetModel = this.getModel('MediaAsset');
    } catch {
      throw new ServiceUnavailableException('media_registry_not_available');
    }
    const assets = await MediaAssetModel.find({
      id: { $in: uniqueIds }, owner_id: senderId, purpose: 'chat', thread_id: threadId,
    }).lean();
    if (assets.length !== uniqueIds.length) throw new BadRequestException('media_not_owned_or_not_bound_to_thread');
    return uniqueIds;
  }

  async checkIfFamily(participantIds: string[]): Promise<boolean> {
    if (participantIds.length < 2) return false;
    const userA = participantIds[0];
    const userB = participantIds[1];
    try {
      const FamilyGroupModel = this.getModel('FamilyGroup');
      const count = await FamilyGroupModel.countDocuments({
        is_deleted: { $ne: true },
        'members.user_id': { $all: [userA, userB] }
      });
      return count > 0;
    } catch {
      return false;
    }
  }

  async verifyCommunicationAllowed(threadId: string, senderId: string): Promise<{ allowed: boolean; message?: string }> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) return { allowed: true };

    const isFamily = await this.checkIfFamily(thread.participant_ids);
    if (isFamily) return { allowed: true };

    if (thread.type === 'booking' && thread.booking_kind === 'consultation') {
      if (!thread.booking_id) return { allowed: false, message: 'معرف الحجز غير موجود.' };
      try {
        const AppointmentModel = this.getModel('Appointment');
        const appt = await AppointmentModel.findOne({ id: thread.booking_id });
        if (!appt) return { allowed: false, message: 'لم يتم العثور على الاستشارة المرتبطة.' };

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
      } catch (err) {
        this.logger.warn(`Appointment validation failed: ${err.message}`);
      }
    }
    return { allowed: true };
  }

  // ── Messages ────────────────────────────────────────────────

  async sendMessage(threadId: string, senderId: string, senderRole: string, body: {
    body?: string; type?: string; attachment_url?: string; attachment_mime?: string;
    attachment_name?: string; attachment_size?: number; duration_seconds?: number;
    reply_to_id?: string; forwarded_from_id?: string; client_message_id?: string; media_ids?: string[];
  }): Promise<ChatMessage> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, senderId);

    const check = await this.verifyCommunicationAllowed(threadId, senderId);
    if (!check.allowed) throw new ForbiddenException(check.message);

    const mediaIds = await this.validateChatMediaIds(threadId, senderId, body?.media_ids);
    if (body?.attachment_url) throw new BadRequestException('attachment_url_not_supported_use_media_ids');

    // Deduplication check
    if (body.client_message_id) {
      const existing = await this.msgs.findOne({ client_message_id: body.client_message_id, thread_id: threadId, sender_id: senderId });
      if (existing) {
        return existing.toObject();
      }
    }

    if (!body?.body?.trim() && mediaIds.length === 0) throw new BadRequestException('empty_message');

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

    // Update thread metadata
    const unread: Record<string, number> = {};
    for (const pid of thread.participant_ids) {
      if (pid !== senderId) unread[`unread_counts.${pid}`] = (thread.unread_counts?.[pid] || 0) + 1;
    }
    await this.threads.updateOne({ id: threadId }, {
      $set: { last_message: (body.body || (mediaIds.length ? '[مرفق]' : '')).slice(0, 150), last_message_at: new Date(), last_message_sender_id: senderId, ...unread },
    });

    // Emit event for realtime delivery + push
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
    } as any).catch(() => null);
    // Realtime fanout — the realtime gateway listens for 'chat.message_sent'
    // via EventEmitter2 and pushes the message to the thread room + peers.
    this.events.emit('chat.message_sent', {
      ...chatPayload,
      actor_account_id: senderId,
      actor_role: senderRole,
      meta: chatPayload,
    });

    return msg.toObject();
  }

  async getMessages(threadId: string, userId: string, options: { before?: string; limit?: number; search?: string }): Promise<{
    messages: ChatMessage[]; has_more: boolean;
  }> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);

    const limit = options.limit || 50;
    const query: any = { thread_id: threadId, is_deleted: false };
    if (options.before) {
      const ref = await this.msgs.findOne({ id: options.before }).lean<any>();
      if (ref) query.createdAt = { $lt: (ref as any).createdAt };
    }
    if (options.search) query.$text = { $search: options.search };

    const messages = await this.msgs.find(query, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(limit + 1).lean();
    const has_more = messages.length > limit;
    return { messages: has_more ? messages.slice(0, limit) : messages, has_more };
  }

  async markRead(threadId: string, userId: string, upToMessageId?: string): Promise<void> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);
    const query: any = { thread_id: threadId, sender_id: { $ne: userId }, read_by: { $ne: userId } };
    if (upToMessageId) {
      const marker: any = await this.msgs.findOne({ id: upToMessageId, thread_id: threadId }).lean();
      if (!marker) throw new BadRequestException('invalid_up_to_message_id');
      query.createdAt = { $lte: marker.createdAt };
    }
    await this.msgs.updateMany(query, { $addToSet: { read_by: userId } });
    await this.threads.updateOne({ id: threadId }, { $set: { [`unread_counts.${userId}`]: 0 } });
  }

  async markDelivered(threadId: string, userId: string): Promise<void> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);
    await this.msgs.updateMany(
      { thread_id: threadId, sender_id: { $ne: userId }, delivered_to: { $ne: userId } },
      { $addToSet: { delivered_to: userId } },
    );
  }

  async editMessage(msgId: string, userId: string, newBody: string): Promise<ChatMessage> {
    const msg = await this.msgs.findOne({ id: msgId });
    if (!msg) throw new NotFoundException('message_not_found');
    if (msg.sender_id !== userId) throw new ForbiddenException('not_sender');
    if (msg.is_deleted) throw new BadRequestException('message_deleted');
    msg.body = newBody;
    msg.is_edited = true;
    msg.edited_at = new Date();
    await msg.save();
    return msg.toObject();
  }

  async deleteMessage(msgId: string, userId: string): Promise<void> {
    const msg = await this.msgs.findOne({ id: msgId });
    if (!msg) throw new NotFoundException('message_not_found');
    if (msg.sender_id !== userId) throw new ForbiddenException('not_sender');
    msg.is_deleted = true;
    msg.deleted_at = new Date();
    msg.body = '';
    await msg.save();
  }

  async addReaction(msgId: string, userId: string, emoji: string): Promise<ChatMessage> {
    const msg = await this.msgs.findOne({ id: msgId });
    if (!msg) throw new NotFoundException('message_not_found');
    const thread = await this.threads.findOne({ id: msg.thread_id });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);
    // Remove previous reaction by this user
    for (const [e, users] of Object.entries(msg.reactions || {})) {
      msg.reactions[e] = (users as string[]).filter(u => u !== userId);
    }
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    (msg.reactions[emoji] as string[]).push(userId);
    msg.markModified('reactions');
    await msg.save();
    return msg.toObject();
  }

  async removeReaction(msgId: string, userId: string, emoji: string): Promise<ChatMessage> {
    const msg = await this.msgs.findOne({ id: msgId });
    if (!msg) throw new NotFoundException('message_not_found');
    const thread = await this.threads.findOne({ id: msg.thread_id });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);
    if (msg.reactions?.[emoji]) {
      msg.reactions[emoji] = (msg.reactions[emoji] as string[]).filter(u => u !== userId);
      msg.markModified('reactions');
      await msg.save();
    }
    return msg.toObject();
  }

  async pinMessage(msgId: string, userId: string): Promise<void> {
    const msg = await this.msgs.findOne({ id: msgId });
    if (!msg) throw new NotFoundException('message_not_found');
    const thread = await this.threads.findOne({ id: msg.thread_id });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);
    await this.msgs.updateOne({ id: msgId }, { $set: { is_pinned: true } });
  }

  async getThread(threadId: string, userId: string): Promise<ChatThread> {
    const thread = await this.threads.findOne({ id: threadId }, { _id: 0, __v: 0 }).lean();
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);
    return thread;
  }

  async addParticipant(threadId: string, actorId: string, userId: string): Promise<void> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, actorId);
    if (thread.type !== 'group' && thread.type !== 'direct') throw new ForbiddenException('participant_management_not_allowed');
    await this.threads.updateOne({ id: threadId }, {
      $addToSet: { participant_ids: userId },
      $set: { [`unread_counts.${userId}`]: 0 },
    });
  }

  async removeParticipant(threadId: string, actorId: string, userId: string): Promise<void> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, actorId);
    if (thread.type !== 'group' && thread.type !== 'direct') throw new ForbiddenException('participant_management_not_allowed');
    await this.threads.updateOne({ id: threadId }, { $pull: { participant_ids: userId } });
  }
}
