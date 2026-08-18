import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // Use the same S3/R2 env contract as the storage module. No secrets in code:
    // missing config fails closed at upload time instead of using stale defaults.
    const endpoint = process.env.S3_ENDPOINT
      || (process.env.CLOUDFLARE_R2_ACCOUNT_ID ? `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
    this.bucketName = process.env.S3_BUCKET || process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
    this.publicUrl = (process.env.S3_PUBLIC_BASE_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName || !this.publicUrl) {
      this.logger.error('Media storage is not configured (S3_* env missing) — uploads will fail closed.');
    }

    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: endpoint || 'https://invalid.invalid',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  async uploadBuffer(buffer: Buffer, originalName: string, mimeType: string, folder = 'general'): Promise<{ url: string; key: string }> {
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

      const url = `${this.publicUrl}/${key}`;
      return { url, key };
    } catch (error) {
      this.logger.error(`Failed to upload file to R2: ${error.message}`, error.stack);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async generatePresignedUploadUrl(originalName: string, mimeType: string, folder = 'general', expiresIn = 3600): Promise<{ uploadUrl: string; downloadUrl: string; key: string }> {
    const extension = originalName.split('.').pop() || '';
    const key = `${folder}/${uuid()}.${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      const downloadUrl = `${this.publicUrl}/${key}`;

      return { uploadUrl, downloadUrl, key };
    } catch (error) {
      this.logger.error(`Failed to generate presigned upload URL: ${error.message}`, error.stack);
      throw new BadRequestException(`Presigned URL generation failed: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
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
