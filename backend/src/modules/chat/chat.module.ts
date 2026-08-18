/**
 * Chat Module composition root. Schemas and service live in independent files
 * so ChatGateway never imports a provider through this module file.
 */
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatThreadSchema, ChatMessageSchema } from './chat.schemas';
import {
  Module, Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ForbiddenException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { EventsModule } from '../events/events.module';

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
  addParticipant(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: { user_id: string }) {
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
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
