import { UserRateLimit, UserRateLimitGuard } from '../../common/user-rate-limit';
import { Controller, Get, GoneException, HttpCode, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MediaService } from './media.service';
import { UploadMediaDto } from './media.dto';
import { MediaAsset, MediaAssetDocument, MEDIA_PURPOSES, MediaPurpose } from './media.schema';
import { CONSULTATION_FOLLOWUP_HOURS_DEFAULT } from '../chat/followup-window';
import { MediaCleanupService } from './media-cleanup.service';
import { MEDIA_PURPOSE_TO_UPLOAD, UploadSecurityService } from '../storage/upload-security.service';
import { FilePendingScanException, PENDING_PREFIX, isPendingKey, isUnscanned } from '../storage/pending-scan';

@Controller('media')
@SelfService()
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @InjectModel(MediaAsset.name) private readonly assets: Model<MediaAssetDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cleanup: MediaCleanupService,
    private readonly uploadSecurity: UploadSecurityService,
  ) {}

  // 16.12: an account may upload 60 files an hour (USER_RATE_LIMIT_UPLOAD=<limit>/<seconds> tunes it)
  @Post('upload')
  @UseGuards(UserRateLimitGuard)
  @UserRateLimit('upload', 60, 3600)
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
    @Body() body: UploadMediaDto,
  ) {
    const purpose = body.purpose;
    const threadId = body.thread_id;
    if (!file) throw new BadRequestException('file_required');
    await this.assertUploadAllowed(user, purpose, threadId);
    // 16.5: what the file IS (magic bytes), the antivirus, no EXIF/GPS on a photo, no active PDF; the stored name and extension
    // are ours, the caller's file name is kept only as a label.
    // UPLOAD_SCAN=defer: when the scanner cannot answer yet the file is written under `pending/`, which no link or read ever
    // touches, and the scan worker moves it to its real key once it has passed.
    const checked = await this.uploadSecurity.inspectMedia({ purpose: MEDIA_PURPOSE_TO_UPLOAD[purpose], declared_mime: file.mimetype, bytes: file.buffer, allow_defer: true });
    const deferred = checked.scan === 'deferred';
    const uploaded = await this.mediaService.uploadBuffer(checked.bytes, `file.${checked.ext}`, checked.mime, `${deferred ? PENDING_PREFIX : ''}${purpose}/${user.id}`);
    try {
      const asset: any = await this.assets.create({
        key: uploaded.key, owner_id: user.id, purpose, thread_id: threadId,
        original_name: file.originalname, mime_type: checked.mime, size_bytes: checked.size_bytes,
        ...(deferred ? { scan_status: 'pending_scan' } : {}),
      });
      return { id: asset.id, purpose: asset.purpose, thread_id: asset.thread_id || null, ...(deferred ? { scan_status: 'pending_scan' } : {}) };
    } catch (error) {
      await this.mediaService.deleteFile(uploaded.key).catch(() => null);
      throw error;
    }
  }

  /**
   * Closed (16.5). A presigned PUT lets the browser or app write straight to the bucket, past the type check, the antivirus and
   * the metadata strip that POST /media/upload applies. No client uses it; every upload goes through POST /media/upload.
   */
  @Post('presigned')
  @HttpCode(410)
  presignedClosed() {
    throw new GoneException('presigned_upload_closed_use_media_upload');
  }

  @Get(':id/url')
  async signedUrl(@CurrentUser() user: any, @Param('id') id: string) {
    const asset: any = await this.assets.findOne({ id: { $eq: id } }).lean();
    if (!asset) throw new NotFoundException('media_not_found');
    if (!await this.canReadAsset(asset, user)) throw new NotFoundException('media_not_found');
    if (isUnscanned(asset.scan_status) || isPendingKey(asset.key)) throw new FilePendingScanException();
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
      const thread = await ChatThreadModel.findOne({ id: { $eq: asset.thread_id }, participant_ids: { $eq: user.id } });
      return Boolean(thread);
    } catch {
      return false;
    }
  }

  private async verifyChatUploadAllowed(threadId: string, userId: string) {
    try {
      const ChatThreadModel = this.connection.model('ChatThread');
      const thread = await ChatThreadModel.findOne({ id: { $eq: threadId }, participant_ids: { $eq: userId } });
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
        const appt = await AppointmentModel.findOne({ id: { $eq: thread.booking_id } });
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
          const followupHours = sysConfig?.value?.consultation_followup_hours ?? CONSULTATION_FOLLOWUP_HOURS_DEFAULT;

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
   * D-32: DELETE /media/<id> — the owner (or an admin) deletes a file by the id the upload returned; DELETE /media/<key>
   * stays admin-only (P1 2026-08-20: no one else may delete an object by key). Either way the R2 object AND its
   * `media_assets` row are removed.
   */
  @Delete('*key')
  async deleteFile(@CurrentUser() user: any, @Param('key') key: string | string[]) {
    const keyStr = Array.isArray(key) ? key.join('/') : key;
    if (!keyStr) {
      throw new BadRequestException('key is required');
    }
    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
    const asset: any = /^[0-9a-f-]{36}$/i.test(keyStr) ? await this.assets.findOne({ id: { $eq: keyStr } }).lean() : null;
    if (asset) {
      if (!isAdmin && asset.owner_id !== user?.id) throw new ForbiddenException('not_owner');
      await this.mediaService.deleteFile(asset.key);
      await this.assets.deleteOne({ id: { $eq: asset.id } });
      return { success: true };
    }
    if (!isAdmin) throw new ForbiddenException('Insufficient role');
    await this.mediaService.deleteFile(keyStr);
    await this.assets.deleteOne({ key: { $eq: keyStr } });
    return { success: true };
  }
}
