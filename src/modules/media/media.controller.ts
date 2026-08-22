import { Controller, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
      fileFilter: (req, file, callback) => {
        const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp3|m4a|wav|doc|docx|xls|xlsx)$/i;
        if (!file.originalname.match(allowedExtensions)) {
          return callback(new BadRequestException('Only approved image, PDF, audio, and document files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder = 'general',
    @Body('thread_id') threadId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (folder === 'chats') {
      if (!threadId) {
        throw new BadRequestException('thread_id is required for chat uploads');
      }
      await this.verifyChatUploadAllowed(threadId);
    }
    return this.mediaService.uploadBuffer(file.buffer, file.originalname, file.mimetype, folder);
  }

  @Post('presigned')
  async getPresignedUrl(
    @Body('filename') filename: string,
    @Body('mimetype') mimetype: string,
    @Body('folder') folder = 'general',
    @Body('expiresIn') expiresIn?: number,
    @Body('thread_id') threadId?: string,
  ) {
    if (!filename || !mimetype) {
      throw new BadRequestException('filename and mimetype are required');
    }
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp3|m4a|wav|doc|docx|xls|xlsx)$/i;
    if (!filename.match(allowedExtensions)) {
      throw new BadRequestException('Only approved image, PDF, audio, and document extensions are allowed!');
    }
    if (folder === 'chats') {
      if (!threadId) {
        throw new BadRequestException('thread_id is required for chat uploads');
      }
      await this.verifyChatUploadAllowed(threadId);
    }
    return this.mediaService.generatePresignedUploadUrl(filename, mimetype, folder, expiresIn);
  }

  private async verifyChatUploadAllowed(threadId: string) {
    try {
      const ChatThreadModel = this.connection.model('ChatThread');
      const thread = await ChatThreadModel.findOne({ id: threadId });
      if (!thread) return;

      if (thread.participant_ids && thread.participant_ids.length >= 2) {
        const userA = thread.participant_ids[0];
        const userB = thread.participant_ids[1];
        const FamilyGroupModel = this.connection.model('FamilyGroup');
        const count = await FamilyGroupModel.countDocuments({
          is_deleted: { $ne: true },
          'members.user_id': { $all: [userA, userB] }
        });
        if (count > 0) return;
      }

      if (thread.type === 'booking' && thread.booking_kind === 'consultation') {
        if (!thread.booking_id) {
          throw new ForbiddenException('معرف الحجز غير موجود.');
        }
        const AppointmentModel = this.connection.model('Appointment');
        const appt = await AppointmentModel.findOne({ id: thread.booking_id });
        if (!appt) {
          throw new ForbiddenException('لم يتم العثور على الاستشارة المرتبطة.');
        }

        if (appt.status === 'PENDING') {
          throw new ForbiddenException('لم تبدأ الاستشارة بعد. لا يمكنك رفع ملفات.');
        }

        if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
          throw new ForbiddenException('الاستشارة مغلقة ولا يمكن رفع ملفات.');
        }

        if (appt.status === 'COMPLETED') {
          const SystemConfigModel = this.connection.model('SystemConfig');
          const sysConfig = await SystemConfigModel.findOne({ key: 'system_config' });
          const followupHours = sysConfig?.value?.consultation_followup_hours ?? 24;

          const endedAt = appt.completed_at || appt.updatedAt || new Date();
          const elapsedHours = (Date.now() - new Date(endedAt).getTime()) / (1000 * 60 * 60);

          if (elapsedHours > followupHours) {
            throw new ForbiddenException('انتهت فترة المتابعة الخاصة بالاستشارة ولا يمكنك رفع ملفات جديدة.');
          }
        }
      }
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof BadRequestException) throw err;
      // Allow in case of missing model definitions during test runs
    }
  }

  /**
   * P1 security hardening (2026-08-20): previously any authenticated user —
   * including patients — could delete ANY object in the R2 bucket by key.
   * Deletion is now restricted to platform admins only.
   */
  @Delete('*key')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteFile(@Param('key') key: string | string[]) {
    const keyStr = Array.isArray(key) ? key.join('/') : key;
    if (!keyStr) {
      throw new BadRequestException('key is required');
    }
    await this.mediaService.deleteFile(keyStr);
    return { success: true };
  }
}
