import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import sharp from 'sharp';
import { ProfileImageMetadata, ProfileImageMetadataDocument } from '../../../schemas/profile-image-metadata.schema';
import { ImageProcessingJob, ImageProcessingJobDocument } from '../../../schemas/image-processing-job.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../../schemas/provider-profile.schema';
import { ProfileImageAuditLog, ProfileImageAuditLogDocument } from '../../../schemas/profile-image-audit-log.schema';
import { StorageService } from '../../storage/storage.module';
import { ProfileImageMetadataRepository } from "./repositories/profileimagemetadata.repository";
import { ImageProcessingJobRepository } from "./repositories/imageprocessingjob.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProfileImageAuditLogRepository } from "./repositories/profileimageauditlog.repository";

@Injectable()
export class ProviderImageProcessorService {
  private readonly logger = new Logger('ProviderImageProcessor');

  constructor(
    @Inject('ProfileImageMetadataRepository') private readonly metadataModel: ProfileImageMetadataRepository,
    @Inject('ImageProcessingJobRepository') private readonly jobModel: ImageProcessingJobRepository,
    @Inject('ProviderAccountProfileRepository') private readonly profileModel: ProviderAccountProfileRepository,
    @Inject('ProfileImageAuditLogRepository') private readonly auditLogModel: ProfileImageAuditLogRepository,
    private readonly storage: StorageService,
  ) {}

  /** Enqueue a new profile image processing job */
  async enqueueJob(input: { owner_id: string; owner_type: 'doctor' | 'nurse'; data_base64: string; mime: string; original_name: string }) {
    // 1. Initial Validation: MIME type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(input.mime)) {
      throw new BadRequestException('Unsupported file format. Please upload JPEG, PNG, or WebP.');
    }

    // 2. Initial Validation: File size
    const buffer = Buffer.from(input.data_base64, 'base64');
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      throw new BadRequestException('File size exceeds the 5MB limit.');
    }

    // 3. Clear any existing pending/processing jobs for this owner to ensure single profile photo constraint
    await this.jobModel.updateMany(
      { owner_id: input.owner_id, status: { $in: ['pending', 'processing'] } },
      { $set: { status: 'failed', error: 'Superseded by new upload' } }
    );

    // 4. Upsert Profile Image Metadata
    const originalUrl = `doctors/original/${input.owner_id}.webp`;

    let meta = await this.metadataModel.findOne({ owner_id: input.owner_id });
    if (!meta) {
      meta = this.metadataModel.create({
        owner_id: input.owner_id,
        owner_type: input.owner_type,
        originalImageUrl: originalUrl,
        processingStatus: 'pending',
        processingProvider: 'local-webp-processor',
      });
    } else {
      meta.processingStatus = 'pending';
      meta.processingProvider = 'local-webp-processor';
      meta.error = undefined;
    }
    await meta.save();

    // 5. Create Queue Job
    const job = await this.jobModel.create({
      owner_id: input.owner_id,
      owner_type: input.owner_type,
      data_base64: input.data_base64,
      mime: input.mime,
      original_name: input.original_name,
      status: 'pending',
    });

    this.logger.log(`Enqueued profile photo job for ${input.owner_type} ID: ${input.owner_id}`);
    return { ok: true, jobId: job.id, status: 'pending' };
  }

  /** Retrieve current profile photo status */
  async getStatus(ownerId: string) {
    const meta = await this.metadataModel.findOne({ owner_id: ownerId });
    if (!meta) throw new NotFoundException('No profile image metadata found');
    return {
      owner_id: meta.owner_id,
      owner_type: meta.owner_type,
      originalImageUrl: meta.originalImageUrl,
      processedImageUrl: meta.processedImageUrl,
      mediumImageUrl: meta.mediumImageUrl,
      thumbnailImageUrl: meta.thumbnailImageUrl,
      hasTransparentBackground: meta.hasTransparentBackground,
      processingStatus: meta.processingStatus,
      processingProvider: meta.processingProvider,
      lastProcessedAt: meta.lastProcessedAt,
      error: meta.error,
    };
  }

  /** Run background image processor every 10 seconds */
  @Cron('*/10 * * * * *')
  async processPendingJobs() {
    const jobs = await this.jobModel.find({ status: 'pending' }).limit(3);
    for (const job of jobs) {
      try {
        job.status = 'processing';
        job.attempts += 1;
        await job.save();

        await this.metadataModel.updateOne({ owner_id: job.owner_id }, { $set: { processingStatus: 'processing' } });

        this.logger.log(`Processing job ${job.id} for owner ${job.owner_id}...`);
        await this.processImage(job);
      } catch (err: any) {
        this.logger.error(`Failed to process image job ${job.id}: ${err.message}`);
        job.status = 'failed';
        job.error = err.message;
        await job.save();

        await this.metadataModel.updateOne(
          { owner_id: job.owner_id },
          { $set: { processingStatus: 'failed', error: err.message, lastProcessedAt: new Date() } }
        );

        // Save Audit Log for Failure
        await this.auditLogModel.create({
          user_id: job.owner_id,
          provider_id: job.owner_id,
          processing_date: new Date(),
          selected_provider: 'local-webp-processor',
          api_key_index_used: -1,
          processing_result: 'failed',
          failure_reason: err.message,
        });
      }
    }
  }

  private async processImage(job: ImageProcessingJobDocument) {
    const buffer = Buffer.from(job.data_base64, 'base64');
    
    // Step 1: Validate image buffer integrity & properties using sharp
    const image = sharp(buffer);
    const meta = await image.metadata();
    
    if (!meta.width || !meta.height) {
      throw new Error('Image is corrupted or has invalid dimensions.');
    }
    
    // Enforce Minimum and Maximum dimensions
    if (meta.width < 100 || meta.height < 100) {
      throw new Error(`Image resolution is too low (${meta.width}x${meta.height}px). Minimum resolution is 100x100px.`);
    }
    if (meta.width > 4000 || meta.height > 4000) {
      throw new Error(`Image resolution is too high (${meta.width}x${meta.height}px). Maximum resolution is 4000x4000px.`);
    }

    // Step 2: Transparency check (alpha channel detection)
    const hasAlpha = meta.hasAlpha || false;

    // Step 3: WebP conversion & Resizing
    // Convert original to WebP format, quality 85
    const originalWebp = await sharp(buffer)
      .webp({ quality: 85 })
      .toBuffer();

    // Large Version (for profile display - max 800x800)
    const largeWebp = await sharp(buffer)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Medium Version (for general grids/lists - max 400x400)
    const mediumWebp = await sharp(buffer)
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    // Thumbnail Version (for list cards - max 200x200)
    const smallWebp = await sharp(buffer)
      .resize({ width: 200, height: 200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    // Step 4: Upload all versions to Cloudflare R2
    const originalPath = `doctors/original/${job.owner_id}.webp`;
    const largePath = `doctors/large/${job.owner_id}.webp`;
    const mediumPath = `doctors/medium/${job.owner_id}.webp`;
    const smallPath = `doctors/small/${job.owner_id}.webp`;

    const originalUpload = await this.storage.upload({
      owner_account_id: job.owner_id,
      owner_kind: 'provider_account',
      mime: 'image/webp',
      data_base64: originalWebp.toString('base64'),
      original_name: 'profile_original.webp',
      visibility: 'public_read',
      customKey: originalPath,
    });

    const largeUpload = await this.storage.upload({
      owner_account_id: job.owner_id,
      owner_kind: 'provider_account',
      mime: 'image/webp',
      data_base64: largeWebp.toString('base64'),
      original_name: 'profile_large.webp',
      visibility: 'public_read',
      customKey: largePath,
    });

    const mediumUpload = await this.storage.upload({
      owner_account_id: job.owner_id,
      owner_kind: 'provider_account',
      mime: 'image/webp',
      data_base64: mediumWebp.toString('base64'),
      original_name: 'profile_medium.webp',
      visibility: 'public_read',
      customKey: mediumPath,
    });

    const smallUpload = await this.storage.upload({
      owner_account_id: job.owner_id,
      owner_kind: 'provider_account',
      mime: 'image/webp',
      data_base64: smallWebp.toString('base64'),
      original_name: 'profile_thumbnail.webp',
      visibility: 'public_read',
      customKey: smallPath,
    });

    const originalUrl = originalUpload.id;
    const processedUrl = largeUpload.id;
    const mediumUrl = mediumUpload.id;
    const thumbnailUrl = smallUpload.id;

    // Step 5: Update Metadata in MongoDB
    await this.metadataModel.updateOne(
      { owner_id: job.owner_id },
      {
        $set: {
          originalImageUrl: originalUrl,
          processedImageUrl: processedUrl,
          mediumImageUrl: mediumUrl,
          thumbnailImageUrl: thumbnailUrl,
          hasTransparentBackground: hasAlpha,
          processingStatus: 'completed',
          lastProcessedAt: new Date(),
        },
      }
    );

    // Step 6: Update profile image in Provider Profile model to processed large URL
    await this.profileModel.updateOne(
      { account_id: job.owner_id },
      { $set: { profile_image_id: processedUrl } }
    );

    job.status = 'completed';
    job.processedAt = new Date();
    await job.save();

    // Step 7: Create audit log on Success
    await this.auditLogModel.create({
      user_id: job.owner_id,
      provider_id: job.owner_id,
      processing_date: new Date(),
      selected_provider: 'local-webp-processor',
      api_key_index_used: -1,
      processing_result: 'success',
    });

    this.logger.log(`Job ${job.id} completed successfully for owner ${job.owner_id}`);
  }

  /** Manual admin overrides & controls */
  async reprocessImage(ownerId: string) {
    const job = await this.jobModel.findOne({ owner_id: ownerId }).sort({ createdAt: -1 });
    if (!job) throw new BadRequestException('No previous upload found to reprocess');
    job.status = 'pending';
    job.error = undefined;
    await job.save();

    await this.metadataModel.updateOne({ owner_id: ownerId }, { $set: { processingStatus: 'pending', error: undefined } });
    return { ok: true, status: 'pending' };
  }

  async replaceImage(ownerId: string, base64: string, mime: string) {
    await this.enqueueJob({
      owner_id: ownerId,
      owner_type: 'doctor', // default fallback type
      data_base64: base64,
      mime,
      original_name: 'replaced_profile.png',
    });
    return { ok: true, status: 'pending' };
  }

  async retryFailedJobs(ownerId: string) {
    const failedJobs = await this.jobModel.find({ owner_id: ownerId, status: 'failed' });
    for (const job of failedJobs) {
      job.status = 'pending';
      job.error = undefined;
      await job.save();
    }
    await this.metadataModel.updateOne({ owner_id: ownerId }, { $set: { processingStatus: 'pending', error: undefined } });
    return { ok: true, retriedCount: failedJobs.length };
  }

  async getImageLogs(ownerId: string) {
    return this.auditLogModel.find({ user_id: ownerId }).sort({ createdAt: -1 });
  }
}
