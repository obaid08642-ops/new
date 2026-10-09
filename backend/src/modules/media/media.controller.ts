import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MultipartFile } from '@fastify/multipart';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { verifyUpload } from './media-types';
import { MediaService } from './media.service';
import { UploadMediaDto, PresignedUrlRequestDto } from './media.dto';
import { MediaAsset, MediaAssetDocument, MEDIA_PURPOSES, MediaPurpose } from './media.schema';
import { UploadRateLimitGuard } from '../../common/guards/abuse-prevention.guard';
import { ChatThread, ChatThreadDocument } from '../chat/chat.schemas';

@Controller('media')
@SelfService()
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @InjectModel(MediaAsset.name) private readonly assets: Model<MediaAssetDocument>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('ChatThread') private readonly chatThreads: Model<ChatThreadDocument>,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
      fileFilter: (req, file: any, callback) => {
        const name = file?.originalname ?? file?.filename ?? '';
        const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp3|m4a|wav|doc|docx|xls|xlsx)$/i;
        if (!String(name).match(allowedExtensions)) {
          return callback(new BadRequestException('Only approved image, PDF, audio, and document files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: any,
    @UploadedFile() file: MultipartFile,
    @Body() body: UploadMediaDto,
  ) {
    const purpose = body.purpose;
    const threadId = body.thread_id;
    if (!file) throw new BadRequestException('file_required');
    await this.assertUploadAllowed(user, purpose, threadId);
    const originalname = (file as any)?.originalname ?? file.filename;
    // Q92: Express/multer (the default adapter) hands a buffer; only Fastify gives a stream.
    const buffer: Buffer = (file as any)?.buffer ?? await MediaController.toBuffer(file.file);
    // Q98: the declared type must belong to the extension and the bytes must be
    // that kind of file; the canonical type is stored, never the client's claim.
    const verdict = verifyUpload(originalname, file.mimetype, buffer.subarray(0, 32));
    if ('reason' in verdict) throw new BadRequestException(verdict.reason);
    const mimetype = verdict.mime;
    const uploaded = await this.mediaService.uploadBuffer(buffer, originalname, mimetype, `${purpose}/${user.id}`);
    try {
      const asset: any = await this.assets.create({
        key: uploaded.key, owner_id: user.id, purpose, thread_id: threadId,
        original_name: originalname, mime_type: mimetype, size_bytes: buffer.length,
      });
      return { id: asset.id, purpose: asset.purpose, thread_id: asset.thread_id || null };
    } catch (error) {
      await this.mediaService.deleteFile(uploaded.key).catch(() => null);
      throw error;
    }
  }

  private static toBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  @Post('presigned')
  @UseGuards(UploadRateLimitGuard)
  async getPresignedUrl(
    @CurrentUser() user: any,
    @Body() body: PresignedUrlRequestDto,
  ) {
    const { filename, mimetype, purpose, thread_id: threadId } = body;
    if (!filename || !mimetype) throw new BadRequestException('filename_and_mimetype_required');
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp3|m4a|wav|doc|docx|xls|xlsx)$/i;
    if (!filename.match(allowedExtensions)) throw new BadRequestException('unsupported_media_extension');
    const mediaPurpose = purpose as MediaPurpose;
    await this.assertUploadAllowed(user, mediaPurpose, threadId);
    const upload = await this.mediaService.generatePresignedUploadUrl(filename, mimetype, `${purpose}/${user.id}`, mediaPurpose);
    const asset: any = await this.assets.create({
      key: upload.key, owner_id: user.id, purpose, thread_id: threadId,
      original_name: filename, mime_type: mimetype,
    });
    return { id: asset.id, upload_url: upload.uploadUrl, expires_in: 900 };
  }

  @Get(':id/url')
  async signedUrl(@CurrentUser() user: any, @Param('id') id: string) {
    const asset: any = await this.assets.findOne({ id: { $eq: id } }).lean();
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
    if (asset.owner_id === user.id) return true;
    if (user.role === UserRole.ADMIN) return true;
    if (asset.purpose === 'chat' && asset.thread_id) {
      // Chat media readable by thread participants only
      const thread = await this.chatThreads.findOne({ thread_id: asset.thread_id, is_active: true }).lean();
      if (!thread) return false;
      return thread.participant_ids?.includes(user.id) ?? false;
    }
    return false;
  }

  private async verifyChatUploadAllowed(threadId: string, userId: string) {
    // Verify user is a participant in the chat thread
    const thread = await this.chatThreads.findOne({ thread_id: threadId, is_active: true }).lean();
    if (!thread) return false;
    return thread.participant_ids?.includes(userId) ?? false;
  }

  @Delete(':id')
  async deleteMedia(@CurrentUser() user: any, @Param('id') id: string) {
    const asset: any = await this.assets.findOne({ id: { $eq: id } }).lean();
    if (!asset) throw new NotFoundException('media_not_found');
    if (asset.owner_id !== user.id && user.role !== UserRole.ADMIN) throw new ForbiddenException('not_your_media');
    await this.mediaService.deleteFile(asset.key);
    await this.assets.deleteOne({ id: { $eq: id } });
    return { success: true };
  }
}
