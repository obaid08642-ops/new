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
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '8fac6a8c9296b585e3a5f71a1a2baa89';
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '1ae2cbf7435e20f4dcdd09fb85673233';
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '862e916171933a690b8a78eaf259d5bb5d927923d40ce6b51bcda6a516edb058';
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'nabd-products-images';
    this.publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-8fac6a8c9296b585e3a5f71a1a2baa89.r2.dev`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
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
