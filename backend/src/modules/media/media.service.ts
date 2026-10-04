import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private configured: boolean;

  constructor() {
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

  /**
   * 14.20 EXIF/GPS strip (code part; imgproxy responsive variants are infra, out of scope).
   * Uses the existing `sharp` dependency (no new deps). sharp drops ALL metadata
   * (EXIF/XMP/IPTC/GPS) unless `.withMetadata()` is called, so re-encoding without
   * it both applies EXIF orientation via `.rotate()` and removes location tags.
   * Scope is still JPEG/PNG/WebP only: GIFs are skipped to preserve animation frames.
   * Fail-closed: an in-scope image sharp cannot parse is rejected, never stored raw.
   */
  private async stripExif(buffer: Buffer, mimeType: string, originalName: string): Promise<Buffer> {
    const ext = (originalName.split('.').pop() || '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();
    const pipeline =
      mime === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg'
        ? sharp(buffer).rotate().jpeg({ quality: 92, mozjpeg: true })
        : mime === 'image/png' || ext === 'png'
          ? sharp(buffer).rotate().png({ compressionLevel: 6 })
          : mime === 'image/webp' || ext === 'webp'
            ? sharp(buffer).rotate().webp({ quality: 90 })
            : null;
    if (!pipeline) return buffer;
    try {
      return await pipeline.toBuffer();
    } catch (error: any) {
      this.logger.warn(`Rejected image upload that failed EXIF-strip parse: ${error?.message || error}`);
      throw new BadRequestException('media_upload_failed');
    }
  }

  async uploadBuffer(buffer: Buffer, originalName: string, mimeType: string, folder = 'general'): Promise<{ key: string }> {
    this.assertConfigured();
    const extension = originalName.split('.').pop() || '';
    const key = `${folder}/${uuid()}.${extension}`;
    // 14.20: strip EXIF/GPS metadata from still images before persisting.
    // Non-image uploads (pdf/audio/docs) and animated GIFs pass through untouched.
    const safeBuffer = await this.stripExif(buffer, mimeType, originalName);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: safeBuffer,
        ContentType: mimeType,
      });
      await this.withTimeout(this.s3Client.send(command), this.opTimeoutMs);
      return { key };
    } catch (error) {
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

  async generatePresignedUploadUrl(originalName: string, mimeType: string, folder = 'general', expiresIn = 15 * 60): Promise<{ uploadUrl: string; key: string }> {
    this.assertConfigured();
    const extension = originalName.split('.').pop() || '';
    const key = `${folder}/${uuid()}.${extension}`;
    // 14.20 hook point: presigned PUTs stream bytes straight to R2, bypassing the
    // server-side stripExif() above (no new deps added for this path by design).
    // EXIF/GPS hygiene for this path must happen client-side before PUT
    // (patient-app/provider-app strip on capture) or via an R2-triggered worker;
    // imgproxy responsive variants are infra and out of scope here.

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
