import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MediaService } from './media.service';
import { MediaAsset, MediaAssetDocument, MEDIA_PURPOSES, MediaPurpose } from './media.schema';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @InjectModel(MediaAsset.name) private readonly assets: Model<MediaAssetDocument>,
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
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('purpose') purpose: MediaPurpose,
    @Body('thread_id') threadId?: string,
  ) {
    if (!file) throw new BadRequestException('file_required');
    await this.assertUploadAllowed(user, purpose, threadId);
    const uploaded = await this.mediaService.uploadBuffer(file.buffer, file.originalname, file.mimetype, `${purpose}/${user.id}`);
    try {
      const asset: any = await this.assets.create({
        key: uploaded.key, owner_id: user.id, purpose, thread_id: threadId,
        original_name: file.originalname, mime_type: file.mimetype, size_bytes: file.size,
      });
      return { id: asset.id, purpose: asset.purpose, thread_id: asset.thread_id || null };
    } catch (error) {
      await this.mediaService.deleteFile(uploaded.key).catch(() => null);
      throw error;
    }
  }

  @Post('presigned')
  async getPresignedUrl(
    @CurrentUser() user: any,
    @Body('filename') filename: string,
    @Body('mimetype') mimetype: string,
    @Body('purpose') purpose: MediaPurpose,
    @Body('thread_id') threadId?: string,
  ) {
    if (!filename || !mimetype) throw new BadRequestException('filename_and_mimetype_required');
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp3|m4a|wav|doc|docx|xls|xlsx)$/i;
    if (!filename.match(allowedExtensions)) throw new BadRequestException('unsupported_media_extension');
    await this.assertUploadAllowed(user, purpose, threadId);
    const upload = await this.mediaService.generatePresignedUploadUrl(filename, mimetype, `${purpose}/${user.id}`);
    const asset: any = await this.assets.create({
      key: upload.key, owner_id: user.id, purpose, thread_id: threadId,
      original_name: filename, mime_type: mimetype,
    });
    return { id: asset.id, upload_url: upload.uploadUrl, expires_in: 900 };
  }

  @Get(':id/url')
  async signedUrl(@CurrentUser() user: any, @Param('id') id: string) {
    const asset: any = await this.assets.findOne({ id }).lean();
    if (!asset) throw new NotFoundException('media_not_found');
    if (!await this.canReadAsset(asset, user)) throw new NotFoundException('media_not_found');
    return { url: await this.mediaService.generatePresignedDownloadUrl(asset.key, 15 * 60), expires_in: 900 };
  }

  private async assertUploadAllowed(user: any, purpose: MediaPurpose, threadId?: string) {
    if (!MEDIA_PURPOSES.includes(purpose)) throw new BadRequestException('invalid_media_purpose');
    if (purpose === 'chat') {
      if (!threadId) throw new BadRequestException('thread_id_required_for_chat_media');
      await this.verifyChatUploadAllowed(threadId, user.id);
    } else if (threadId) {
      throw new BadRequestException('thread_id_only_supported_for_chat_media');
    }
  }

  private async canReadAsset(asset: any, user: any): Promise<boolean> {
    if (asset.owner_id === user?.id) return true;
    if (asset.purpose !== 'chat' || !asset.thread_id) return false;
    try {
      const ChatThreadModel = this.connection.model('ChatThread');
      const thread = await ChatThreadModel.findOne({ id: asset.thread_id, participant_ids: user.id });
      return Boolean(thread);
    } catch {
      return false;
    }
  }

  private async verifyChatUploadAllowed(threadId: string, userId: string) {
    try {
      const ChatThreadModel = this.connection.model('ChatThread');
      const thread = await ChatThreadModel.findOne({ id: threadId, participant_ids: userId });
      if (!thread) throw new NotFoundException('thread_not_found');

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
      if (err instanceof ForbiddenException || err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      // Fail closed instead of accepting a chat attachment when the relationship cannot be verified.
      throw new BadRequestException('chat_media_authorization_unavailable');
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
