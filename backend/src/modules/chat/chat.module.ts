/**
 * Chat Module — Full production implementation with:
 * - 1:1 and group conversations
 * - Typing indicators, read receipts, delivery status
 * - Voice notes, image, file attachments
 * - Message reactions, edit, delete, reply, forward
 * - Pagination, search, unread counters
 * - Offline sync, push notification integration
 * - Socket.IO real-time events
 */
import { ChatGateway } from './chat.gateway';
import {
  Module, Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ForbiddenException, BadRequestException, Injectable,
  NotFoundException, Logger,
} from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema as NSchema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { EventBusService } from '../events/event-bus.service';
import { EventsModule } from '../events/events.module';
import { OnEvent } from '@nestjs/event-emitter';

// ─── Schemas ────────────────────────────────────────────────────────────────

@NSchema({ timestamps: true, collection: 'chat_threads' })
export class ChatThread {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true, enum: ['direct', 'group', 'booking'] }) type: string;
  @Prop({ type: [String], required: true, index: true }) participant_ids: string[];
  @Prop() name?: string;
  @Prop() avatar_url?: string;
  @Prop() booking_kind?: string;
  @Prop() booking_id?: string;
  @Prop() last_message?: string;
  @Prop() last_message_at?: Date;
  @Prop() last_message_sender_id?: string;
  @Prop({ type: Object, default: {} }) unread_counts: Record<string, number>;
  @Prop({ default: true }) is_active: boolean;
  @Prop() created_by?: string;
}
export type ChatThreadDocument = ChatThread & Document;
export const ChatThreadSchema = SchemaFactory.createForClass(ChatThread);
ChatThreadSchema.index({ participant_ids: 1 });
ChatThreadSchema.index({ booking_kind: 1, booking_id: 1 });

@NSchema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessage {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ unique: true, sparse: true, index: true }) client_message_id?: string;
  @Prop({ required: true, index: true }) thread_id: string;
  @Prop({ required: true }) sender_id: string;
  @Prop({ required: true }) sender_role: string;
  @Prop({ default: '' }) body: string;
  @Prop({ default: 'text', enum: ['text', 'image', 'voice', 'file', 'system'] }) type: string;
  @Prop() attachment_url?: string;
  @Prop() attachment_mime?: string;
  @Prop() attachment_name?: string;
  @Prop() attachment_size?: number;
  @Prop() duration_seconds?: number; // voice note
  @Prop() reply_to_id?: string;
  @Prop() forwarded_from_id?: string;
  @Prop({ type: Object, default: {} }) reactions: Record<string, string[]>; // emoji -> user_ids
  @Prop({ type: [String], default: [] }) read_by: string[];
  @Prop({ type: [String], default: [] }) delivered_to: string[];
  @Prop({ default: false }) is_edited: boolean;
  @Prop() edited_at?: Date;
  @Prop({ default: false }) is_deleted: boolean;
  @Prop() deleted_at?: Date;
  @Prop({ default: false }) is_pinned: boolean;
}
export type ChatMessageDocument = ChatMessage & Document;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ thread_id: 1, createdAt: -1 });
ChatMessageSchema.index({ thread_id: 1, is_deleted: 1 });
ChatMessageSchema.index({ body: 'text' });

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ChatService {
  private readonly logger = new Logger('ChatService');

  constructor(
    @InjectModel('ChatThread') public readonly threads: Model<ChatThreadDocument>,
    @InjectModel('ChatMessage') private readonly msgs: Model<ChatMessageDocument>,
    private readonly bus: EventBusService,
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

  async getOrCreateBookingThread(bookingKind: string, bookingId: string, patientId: string, providerId?: string): Promise<ChatThread> {
    let thread = await this.threads.findOne({ type: 'booking', booking_kind: bookingKind, booking_id: bookingId });
    if (!thread) {
      const participants = providerId ? [patientId, providerId] : [patientId];
      const counts: Record<string, number> = {};
      participants.forEach(id => counts[id] = 0);
      thread = await this.threads.create({ type: 'booking', booking_kind: bookingKind, booking_id: bookingId, participant_ids: participants, created_by: patientId, unread_counts: counts });
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
    if (!thread.participant_ids.includes(userId)) throw new ForbiddenException('not_participant');
  }

  getModel(name: string): Model<any> {
    return this.threads.db.model(name);
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
    reply_to_id?: string; forwarded_from_id?: string; client_message_id?: string;
  }): Promise<ChatMessage> {
    const thread = await this.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, senderId);

    const check = await this.verifyCommunicationAllowed(threadId, senderId);
    if (!check.allowed) throw new ForbiddenException(check.message);

    // Deduplication check
    if (body.client_message_id) {
      const existing = await this.msgs.findOne({ client_message_id: body.client_message_id });
      if (existing) {
        return existing.toObject();
      }
    }

    if (!body?.body?.trim() && !body?.attachment_url) throw new BadRequestException('empty_message');

    const msg = await this.msgs.create({
      thread_id: threadId,
      sender_id: senderId,
      sender_role: senderRole,
      body: body.body?.trim() || '',
      type: body.type || (body.attachment_url ? (body.attachment_mime?.startsWith('image/') ? 'image' : body.attachment_mime?.startsWith('audio/') ? 'voice' : 'file') : 'text'),
      attachment_url: body.attachment_url,
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
      $set: { last_message: (body.body || '[مرفق]').slice(0, 150), last_message_at: new Date(), last_message_sender_id: senderId, ...unread },
    });

    // Emit event for realtime delivery + push
    this.bus.emit({
      type: 'chat.message_sent',
      entity_type: 'chat_message',
      entity_id: msg.id,
      actor_account_id: senderId,
      actor_role: senderRole,
      patient_id: thread.participant_ids[0],
      meta: {
        thread_id: threadId,
        msg_id: msg.id,
        body: (body.body || '').slice(0, 120),
        type: msg.type,
        sender_id: senderId,
        participant_ids: thread.participant_ids,
        created_at: new Date(),
      },
    } as any).catch(() => null);

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

  async markRead(threadId: string, userId: string): Promise<void> {
    await this.msgs.updateMany(
      { thread_id: threadId, sender_id: { $ne: userId }, read_by: { $ne: userId } },
      { $addToSet: { read_by: userId } },
    );
    await this.threads.updateOne({ id: threadId }, { $set: { [`unread_counts.${userId}`]: 0 } });
  }

  async markDelivered(threadId: string, userId: string): Promise<void> {
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
    if (msg.reactions?.[emoji]) {
      msg.reactions[emoji] = (msg.reactions[emoji] as string[]).filter(u => u !== userId);
      msg.markModified('reactions');
      await msg.save();
    }
    return msg.toObject();
  }

  async pinMessage(msgId: string, userId: string): Promise<void> {
    await this.msgs.updateOne({ id: msgId }, { $set: { is_pinned: true } });
  }

  async getThread(threadId: string, userId: string): Promise<ChatThread> {
    const thread = await this.threads.findOne({ id: threadId }, { _id: 0, __v: 0 }).lean();
    if (!thread) throw new NotFoundException('thread_not_found');
    this.assertParticipant(thread, userId);
    return thread;
  }

  async addParticipant(threadId: string, userId: string): Promise<void> {
    await this.threads.updateOne({ id: threadId }, {
      $addToSet: { participant_ids: userId },
      $set: { [`unread_counts.${userId}`]: 0 },
    });
  }

  async removeParticipant(threadId: string, userId: string): Promise<void> {
    await this.threads.updateOne({ id: threadId }, { $pull: { participant_ids: userId } });
  }
}

// ─── Controller ────────────────────────────────────────────────────────────

@Controller(['chat', 'chats'])
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get('threads/:threadId/permissions')
  async getThreadPermissions(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    const thread = await this.svc.threads.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('thread_not_found');

    const isFamily = await this.svc.checkIfFamily(thread.participant_ids);
    if (isFamily || thread.type !== 'booking' || thread.booking_kind !== 'consultation') {
      return {
        status_code: 'active',
        status_text_ar: 'استشارة نشطة',
        status_text_en: 'Active Consultation',
        can_chat: true,
        can_call: true,
        can_upload: true,
        message_ar: 'الاستشارة نشطة الآن. يمكنك التحدث وإرسال الملفات وإجراء المكالمات.',
        message_en: 'Consultation is active. Chat, call, and uploads are enabled.',
      };
    }

    const AppointmentModel = this.svc.getModel('Appointment');
    const appt = await AppointmentModel.findOne({ id: thread.booking_id });
    if (!appt) {
      return {
        status_code: 'closed',
        status_text_ar: 'الاستشارة مغلقة',
        status_text_en: 'Consultation Closed',
        can_chat: false,
        can_call: false,
        can_upload: false,
        message_ar: 'لم يتم العثور على استشارة مرتبطة بهذه المحادثة.',
        message_en: 'No consultation associated with this conversation.',
      };
    }

    if (appt.status === 'PENDING') {
      return {
        status_code: 'upcoming',
        status_text_ar: 'حجز قادم',
        status_text_en: 'Upcoming Consultation',
        can_chat: false,
        can_call: false,
        can_upload: false,
        message_ar: 'لم تبدأ الاستشارة بعد. ستتمكن من التواصل مع الطبيب بمجرد تأكيد الحجز وبدء الموعد.',
        message_en: 'Consultation has not started yet. You can communicate once the booking is confirmed.',
        booking_id: thread.booking_id,
      };
    }

    if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
      return {
        status_code: 'closed',
        status_text_ar: 'الاستشارة مغلقة',
        status_text_en: 'Consultation Closed',
        can_chat: false,
        can_call: false,
        can_upload: false,
        message_ar: appt.status === 'CANCELLED' ? 'تم إلغاء هذه الاستشارة.' : 'تم تسجيل عدم حضور للاستشارة.',
        message_en: appt.status === 'CANCELLED' ? 'This consultation was cancelled.' : 'No-show was recorded for this consultation.',
        booking_id: thread.booking_id,
      };
    }

    if (appt.status === 'COMPLETED') {
      const SystemConfigModel = this.svc.getModel('SystemConfig');
      const sysConfig = await SystemConfigModel.findOne({ key: 'system_config' });
      const followupHours = sysConfig?.value?.consultation_followup_hours ?? 24;

      const endedAt = appt.completed_at || appt.updatedAt || new Date();
      const elapsedHours = (Date.now() - new Date(endedAt).getTime()) / (1000 * 60 * 60);
      const remainingHours = Math.max(0, followupHours - elapsedHours);

      if (remainingHours > 0) {
        return {
          status_code: 'follow_up',
          status_text_ar: 'فترة المتابعة',
          status_text_en: 'Follow-up Period',
          can_chat: true,
          can_call: false,
          can_upload: true,
          message_ar: 'فترة المتابعة نشطة. يمكنك إرسال الرسائل والملفات فقط. المكالمات غير متاحة.',
          message_en: 'Follow-up period is active. Chat and uploads are enabled. Voice/video calls are disabled.',
          remaining_hours: remainingHours,
          booking_id: thread.booking_id,
        };
      } else {
        return {
          status_code: 'closed',
          status_text_ar: 'الاستشارة مغلقة',
          status_text_en: 'Consultation Closed',
          can_chat: false,
          can_call: false,
          can_upload: false,
          message_ar: 'انتهت فترة المتابعة الخاصة بالاستشارة.',
          message_en: 'Consultation follow-up period has ended.',
          remaining_hours: 0,
          booking_id: thread.booking_id,
        };
      }
    }

    return {
      status_code: 'active',
      status_text_ar: 'استشارة نشطة',
      status_text_en: 'Active Consultation',
      can_chat: true,
      can_call: true,
      can_upload: true,
      message_ar: 'الاستشارة نشطة الآن. يمكنك التحدث وإرسال الملفات وإجراء المكالمات.',
      message_en: 'Consultation is active. Chat, call, and uploads are enabled.',
      booking_id: thread.booking_id,
    };
  }

  @Get('threads')
  myThreads(@CurrentUser() u: any, @Query('page') page = 1, @Query('limit') limit = 30) {
    return this.svc.myThreads(u.id, +page, +limit);
  }

  @Post('threads/direct')
  createDirect(@CurrentUser() u: any, @Body() body: { other_user_id: string }) {
    return this.svc.getOrCreateDirectThread(u.id, body.other_user_id);
  }

  @Post('threads/group')
  createGroup(@CurrentUser() u: any, @Body() body: { name: string; participant_ids: string[] }) {
    return this.svc.createGroupThread(u.id, body.name, body.participant_ids);
  }

  @Post('threads/booking')
  createBooking(@CurrentUser() u: any, @Body() body: { booking_kind: string; booking_id: string; provider_id?: string }) {
    return this.svc.getOrCreateBookingThread(body.booking_kind, body.booking_id, u.id, body.provider_id);
  }

  @Get('threads/:threadId')
  getThread(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    return this.svc.getThread(threadId, u.id);
  }

  @Get('threads/:threadId/messages')
  getMessages(
    @CurrentUser() u: any,
    @Param('threadId') threadId: string,
    @Query('before') before?: string,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    return this.svc.getMessages(threadId, u.id, { before, limit: +limit, search });
  }

  @Post('threads/:threadId/messages')
  sendMessage(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: any) {
    return this.svc.sendMessage(threadId, u.id, u.role || 'patient', body);
  }

  @Post('threads/:threadId/read')
  markRead(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    return this.svc.markRead(threadId, u.id);
  }

  @Post('threads/:threadId/delivered')
  markDelivered(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    return this.svc.markDelivered(threadId, u.id);
  }

  @Patch('messages/:msgId')
  editMessage(@CurrentUser() u: any, @Param('msgId') msgId: string, @Body() body: { body: string }) {
    return this.svc.editMessage(msgId, u.id, body.body);
  }

  @Delete('messages/:msgId')
  deleteMessage(@CurrentUser() u: any, @Param('msgId') msgId: string) {
    return this.svc.deleteMessage(msgId, u.id);
  }

  @Post('messages/:msgId/reactions')
  addReaction(@CurrentUser() u: any, @Param('msgId') msgId: string, @Body() body: { emoji: string }) {
    return this.svc.addReaction(msgId, u.id, body.emoji);
  }

  @Delete('messages/:msgId/reactions/:emoji')
  removeReaction(@CurrentUser() u: any, @Param('msgId') msgId: string, @Param('emoji') emoji: string) {
    return this.svc.removeReaction(msgId, u.id, emoji);
  }

  @Post('messages/:msgId/pin')
  pinMessage(@CurrentUser() u: any, @Param('msgId') msgId: string) {
    return this.svc.pinMessage(msgId, u.id);
  }

  @Post('threads/:threadId/participants')
  addParticipant(@Param('threadId') threadId: string, @Body() body: { user_id: string }) {
    return this.svc.addParticipant(threadId, body.user_id);
  }

  @Delete('threads/:threadId/participants/:userId')
  removeParticipant(@Param('threadId') threadId: string, @Param('userId') userId: string) {
    return this.svc.removeParticipant(threadId, userId);
  }
}

// ─── Module ────────────────────────────────────────────────────────────────

@Module({
  imports: [
    EventsModule,
    MongooseModule.forFeature([
      { name: 'ChatThread', schema: ChatThreadSchema },
      { name: 'ChatMessage', schema: ChatMessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
