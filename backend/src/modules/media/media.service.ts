import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

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

  async uploadBuffer(buffer: Buffer, originalName: string, mimeType: string, folder = 'general'): Promise<{ key: string }> {
    this.assertConfigured();
    const extension = originalName.split('.').pop() || '';
    const key = `${folder}/${uuid()}.${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });
      await this.s3Client.send(command);
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

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file from R2: ${error.message}`, error.stack);
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }
}
