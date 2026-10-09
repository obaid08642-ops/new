/**
 * Chat Module composition root. Schemas and service live in independent files
 * so ChatGateway never imports a provider through this module file.
 */
import { ChatGateway } from './chat.gateway';
import { SendMessageDto, CreateDirectDto, CreateGroupDto, CreateBookingDto, MarkReadDto, EditMessageDto, AddReactionDto, AddParticipantDto} from './chat.dto';
import { ChatService } from './chat.service';
import { EMERGENCY_LINE } from './consultation-window';
import { ChatThreadSchema, ChatMessageSchema } from './chat.schemas';
import {
  Module, Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ForbiddenException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard, CurrentUser, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { EventsModule } from '../events/events.module';
import { FamilyChatController } from './chat-compat.controller';
import { CONSULTATION_FOLLOWUP_HOURS_DEFAULT } from './followup-window';

// ─── Controller ────────────────────────────────────────────────────────────

@Controller(['chat', 'chats'])
@SelfService()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get('threads/:threadId/permissions')
  async getThreadPermissions(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    const thread = await this.svc.threads.findOne({ id: { $eq: threadId } });
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

    // Decision 24: one rule set for sending, calling and this answer (consultation-window.ts).
    const { appt, state } = (await this.svc.consultationThreadState(thread))!;
    const base = { booking_id: thread.booking_id, emergency_line: EMERGENCY_LINE, can_chat: state.can_chat, can_call: state.can_call, can_upload: state.can_upload, can_voice: state.can_voice, online: state.online };
    const followUp = appt ? { action: 'book_follow_up', doctor_id: appt.doctor_id || null, doctor_user_id: appt.doctor_user_id || null, specialty: appt.specialty || appt.specialty_id || null } : null;
    switch (state.phase) {
      case 'missing':
        return { ...base, status_code: 'closed', status_text_ar: 'الاستشارة مغلقة', status_text_en: 'Consultation Closed', message_ar: 'لم يتم العثور على استشارة مرتبطة بهذه المحادثة.', message_en: 'No consultation associated with this conversation.' };
      case 'cancelled':
        return { ...base, status_code: 'closed', status_text_ar: 'الاستشارة مغلقة', status_text_en: 'Consultation Closed', message_ar: appt?.status === 'NO_SHOW' ? 'تم تسجيل عدم حضور للاستشارة.' : 'تم إلغاء هذه الاستشارة.', message_en: appt?.status === 'NO_SHOW' ? 'No-show was recorded for this consultation.' : 'This consultation was cancelled.' };
      case 'upcoming':
        return state.online
          ? { ...base, status_code: 'upcoming', status_text_ar: 'حجز قادم', status_text_en: 'Upcoming Consultation', message_ar: 'لم تبدأ الاستشارة بعد. ستتمكن من التواصل مع الطبيب بمجرد تأكيد الحجز وبدء الموعد.', message_en: 'Consultation has not started yet. You can communicate once the booking is confirmed.' }
          : { ...base, status_code: 'upcoming', status_text_ar: 'زيارة قادمة', status_text_en: 'Upcoming Visit', message_ar: 'تُفتح المحادثة بعد أن يُنهي الطبيب الزيارة.', message_en: 'The chat opens after the doctor completes the visit.' };
      case 'follow_up':
        return { ...base, status_code: 'follow_up', status_text_ar: 'فترة المتابعة', status_text_en: 'Follow-up Period', message_ar: state.online ? 'فترة المتابعة نشطة. يمكنك إرسال الرسائل والصور والملفات والرسائل الصوتية. المكالمات غير متاحة.' : 'فترة المتابعة نشطة. يمكنك إرسال الرسائل والصور والملفات فقط.', message_en: state.online ? 'Follow-up period: messages, images, files and voice notes. Calls are off.' : 'Follow-up period: messages, images and files only.', remaining_hours: state.remaining_hours, window_ends_at: state.window_ends_at, extended: !!(thread as any).extension_count };
      case 'expired':
      case 'closed':
        return { ...base, status_code: 'closed', status_text_ar: 'المحادثة للقراءة فقط', status_text_en: 'Read-only', message_ar: state.phase === 'closed' ? 'أغلق الطبيب هذه المحادثة. يمكنك حجز موعد متابعة.' : 'انتهت فترة المتابعة. يمكنك حجز موعد متابعة.', message_en: state.phase === 'closed' ? 'The doctor closed this conversation. You can book a follow-up.' : 'The follow-up period has ended. You can book a follow-up.', remaining_hours: 0, read_only: true, book_follow_up: followUp };
      default:
        return { ...base, status_code: 'active', status_text_ar: 'استشارة نشطة', status_text_en: 'Active Consultation', message_ar: 'الاستشارة نشطة الآن. يمكنك التحدث وإرسال الملفات وإجراء المكالمات.', message_en: 'Consultation is active. Chat, call, and uploads are enabled.' };
    }
  }

  /** Decision 24: the consultation's doctor closes the thread early (the patient can still read). */
  @Post('threads/:threadId/close')
  closeThread(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    return this.svc.closeConsultationThread(threadId, u.id);
  }

  /** Decision 24: the consultation's doctor extends the follow-up window once. */
  @Post('threads/:threadId/extend')
  extendThread(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    return this.svc.extendConsultationThread(threadId, u.id);
  }

  @Get('threads')
  myThreads(@CurrentUser() u: any, @Query('page') page = 1, @Query('limit') limit = 30) {
    return this.svc.myThreads(u.id, +page, +limit);
  }

  /** Admin console: all threads with message counts (role-gated). */
  @Get('admin/threads')
  @Roles(UserRole.ADMIN)
  async adminThreads(@Query('page') page = 1, @Query('limit') limit = 30, @Query('q') q?: string) {
    return this.svc.adminThreads(+page, +limit, q);
  }

  @Post('threads/direct')
  createDirect(@CurrentUser() u: any, @Body() body: CreateDirectDto) {
    return this.svc.getOrCreateDirectThread(u.id, body.other_user_id);
  }

  @Post('threads/group')
  createGroup(@CurrentUser() u: any, @Body() body: CreateGroupDto) {
    return this.svc.createGroupThread(u.id, body.name, body.participant_ids);
  }

  @Post('threads/booking')
  createBooking(@CurrentUser() u: any, @Body() body: CreateBookingDto) {
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
  @RequireIdempotency()
  sendMessage(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: SendMessageDto) {
    return this.svc.sendMessage(threadId, u.id, u.role || 'patient', body);
  }

  @Post('threads/:threadId/read')
  markRead(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: MarkReadDto) {
    return this.svc.markRead(threadId, u.id, body?.up_to_message_id);
  }

  @Get('threads/:threadId/rt-token')
  rtToken(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    return this.svc.issueRealtimeToken(threadId, u);
  }

  @Post('threads/:threadId/delivered')
  markDelivered(@CurrentUser() u: any, @Param('threadId') threadId: string) {
    return this.svc.markDelivered(threadId, u.id);
  }

  @Patch('messages/:msgId')
  editMessage(@CurrentUser() u: any, @Param('msgId') msgId: string, @Body() body: EditMessageDto) {
    return this.svc.editMessage(msgId, u.id, body.body);
  }

  @Delete('messages/:msgId')
  deleteMessage(@CurrentUser() u: any, @Param('msgId') msgId: string) {
    return this.svc.deleteMessage(msgId, u.id);
  }

  @Post('messages/:msgId/reactions')
  addReaction(@CurrentUser() u: any, @Param('msgId') msgId: string, @Body() body: AddReactionDto) {
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
  addParticipant(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: AddParticipantDto) {
    return this.svc.addParticipant(threadId, u.id, body.user_id);
  }

  @Delete('threads/:threadId/participants/:userId')
  removeParticipant(@CurrentUser() u: any, @Param('threadId') threadId: string, @Param('userId') userId: string) {
    return this.svc.removeParticipant(threadId, u.id, userId);
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
  controllers: [ChatController, FamilyChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
