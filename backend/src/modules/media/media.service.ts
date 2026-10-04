import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import { UploadSecurityService, UPLOAD_PURPOSE_CONFIGS } from '../storage/upload-security.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private configured: boolean;

  constructor(private readonly uploadSecurity: UploadSecurityService) {
    // Use the same S3/R2 env contract as the storage module. No secrets in code:
    // missing config fails closed at upload time instead of using stale defaults.
    const endpoint = process.env.S3_ENDPOINT
      || (process.env.CLOUDFLARE_R2_ACCOUNT_ID ? `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
    this.bucketName = process.env.S3_BUCKET || process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
    this.configured = Boolean(endpoint && accessKeyId && secretAccessKey && this.bucketName);

    if (!this.configured) {
      this.logger.error('Media storage is not configured (S3_* env missing) — uploads and signed URLs fail closed.');
    }

    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: endpoint || 'https://invalid.invalid',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  private assertConfigured() {
    if (!this.configured) throw new ServiceUnavailableException('media_storage_not_configured');
  }

  /** Per-call timeout for R2/S3 calls (ms). Env-overridable for tests. */
  private get opTimeoutMs() { return Number(process.env.S3_TIMEOUT_MS) || 30000; }

  /** Rejects after ms so a hung object-store call fails fast (callers fail closed). */
  private withTimeout(p: Promise<any>, ms: number): Promise<any> {
    let t: any;
    const gate = new Promise<never>((_, rej) => {
      t = setTimeout(() => rej(new Error('media_s3_timeout')), ms);
      (t as any)?.unref?.();
    });
    return Promise.race([p, gate]).finally(() => clearTimeout(t)) as Promise<any>;
  }

  async uploadBuffer(buffer: Buffer, originalName: string, mimeType: string, folder = 'general', purpose: string = 'general'): Promise<{ key: string; security: any }> {
    this.assertConfigured();

    const config = UPLOAD_PURPOSE_CONFIGS[purpose] || UPLOAD_PURPOSE_CONFIGS.general;
    const secureResult = await this.uploadSecurity.validateAndSecureUpload(buffer, originalName, mimeType, purpose);

    if (secureResult.sizeBytes > config.maxSizeBytes) {
      throw new BadRequestException(`File exceeds ${config.maxSizeBytes / (1024 * 1024)}MB limit for ${purpose}`);
    }

    const extension = originalName.split('.').pop() || '';
    const key = this.uploadSecurity.generateSecureKey(purpose, folder);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: secureResult.buffer,
        ContentType: secureResult.mimeType,
      });
      await this.withTimeout(this.s3Client.send(command), this.opTimeoutMs);
      return {
        key,
        security: {
          sanitized: secureResult.sanitized,
          exifStripped: secureResult.exifStripped,
          clamavScanned: secureResult.clamavScanned,
          pdfSanitized: secureResult.pdfSanitized,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload private file to R2: ${error.message}`, error.stack);
      throw new BadRequestException('media_upload_failed');
    }
  }

  async generatePresignedDownloadUrl(key: string, expiresIn = 15 * 60): Promise<string> {
    this.assertConfigured();
    try {
      return await getSignedUrl(this.s3Client, new GetObjectCommand({ Bucket: this.bucketName, Key: key }), { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate private download URL: ${error.message}`, error.stack);
      throw new BadRequestException('media_url_generation_failed');
    }
  }

  async generatePresignedUploadUrl(originalName: string, mimeType: string, folder = 'general', purpose: string = 'general', expiresIn = 15 * 60): Promise<{ uploadUrl: string; key: string }> {
    this.assertConfigured();
    const config = UPLOAD_PURPOSE_CONFIGS[purpose] || UPLOAD_PURPOSE_CONFIGS.general;

    // Validate the declared mime type and extension against purpose config
    if (!config.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`Mime type ${mimeType} not allowed for ${purpose}`);
    }

    const extension = originalName.split('.').pop() || '';
    if (extension && !config.allowedExtensions.includes(extension)) {
      throw new BadRequestException(`File extension .${extension} not allowed for ${purpose}`);
    }

    const key = this.uploadSecurity.generateSecureKey(purpose, folder);

    // 14.20 hook point: presigned PUTs stream bytes straight to R2, bypassing the
    // server-side stripExif() above (no new deps added for this path by design).
    // EXIF/GPS hygiene for this path must happen client-side before PUT
    // (patient-app/provider-app strip on capture) or via an R2-triggered worker;
    // imgproxy responsive variants are infra and out of scope here.
    // Note: Client should be informed to strip EXIF and sanitize PDFs before upload.

    try {
      const command = new PutObjectCommand({ Bucket: this.bucketName, Key: key, ContentType: mimeType });
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: Math.min(Math.max(expiresIn, 60), 15 * 60) });
      return { uploadUrl, key };
    } catch (error) {
      this.logger.error(`Failed to generate private presigned upload URL: ${error.message}`, error.stack);
      throw new BadRequestException('media_upload_url_generation_failed');
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.assertConfigured();
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.withTimeout(this.s3Client.send(command), Math.min(this.opTimeoutMs, 15000));
    } catch (error) {
      this.logger.error(`Failed to delete file from R2: ${error.message}`, error.stack);
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }
}
