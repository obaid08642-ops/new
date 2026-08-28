"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderImageProcessorService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const sharp_1 = __importDefault(require("sharp"));
const storage_module_1 = require("../../storage/storage.module");
const profileimagemetadata_repository_1 = require("./repositories/profileimagemetadata.repository");
const imageprocessingjob_repository_1 = require("./repositories/imageprocessingjob.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const profileimageauditlog_repository_1 = require("./repositories/profileimageauditlog.repository");
let ProviderImageProcessorService = class ProviderImageProcessorService {
    constructor(metadataModel, jobModel, profileModel, auditLogModel, storage) {
        this.metadataModel = metadataModel;
        this.jobModel = jobModel;
        this.profileModel = profileModel;
        this.auditLogModel = auditLogModel;
        this.storage = storage;
        this.logger = new common_1.Logger('ProviderImageProcessor');
    }
    async enqueueJob(input) {
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(input.mime)) {
            throw new common_1.BadRequestException('Unsupported file format. Please upload JPEG, PNG, or WebP.');
        }
        const buffer = Buffer.from(input.data_base64, 'base64');
        const maxSize = 5 * 1024 * 1024;
        if (buffer.length > maxSize) {
            throw new common_1.BadRequestException('File size exceeds the 5MB limit.');
        }
        await this.jobModel.updateMany({ owner_id: input.owner_id, status: { $in: ['pending', 'processing'] } }, { $set: { status: 'failed', error: 'Superseded by new upload' } });
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
        }
        else {
            meta.processingStatus = 'pending';
            meta.processingProvider = 'local-webp-processor';
            meta.error = undefined;
        }
        await meta.save();
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
    async getStatus(ownerId) {
        const meta = await this.metadataModel.findOne({ owner_id: ownerId });
        if (!meta)
            throw new common_1.NotFoundException('No profile image metadata found');
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
            }
            catch (err) {
                this.logger.error(`Failed to process image job ${job.id}: ${err.message}`);
                job.status = 'failed';
                job.error = err.message;
                await job.save();
                await this.metadataModel.updateOne({ owner_id: job.owner_id }, { $set: { processingStatus: 'failed', error: err.message, lastProcessedAt: new Date() } });
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
    async processImage(job) {
        const buffer = Buffer.from(job.data_base64, 'base64');
        const image = (0, sharp_1.default)(buffer);
        const meta = await image.metadata();
        if (!meta.width || !meta.height) {
            throw new Error('Image is corrupted or has invalid dimensions.');
        }
        if (meta.width < 100 || meta.height < 100) {
            throw new Error(`Image resolution is too low (${meta.width}x${meta.height}px). Minimum resolution is 100x100px.`);
        }
        if (meta.width > 4000 || meta.height > 4000) {
            throw new Error(`Image resolution is too high (${meta.width}x${meta.height}px). Maximum resolution is 4000x4000px.`);
        }
        const hasAlpha = meta.hasAlpha || false;
        const originalWebp = await (0, sharp_1.default)(buffer)
            .webp({ quality: 85 })
            .toBuffer();
        const largeWebp = await (0, sharp_1.default)(buffer)
            .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
        const mediumWebp = await (0, sharp_1.default)(buffer)
            .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 })
            .toBuffer();
        const smallWebp = await (0, sharp_1.default)(buffer)
            .resize({ width: 200, height: 200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 70 })
            .toBuffer();
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
            target: 'cloudinary',
        });
        const largeUpload = await this.storage.upload({
            owner_account_id: job.owner_id,
            owner_kind: 'provider_account',
            mime: 'image/webp',
            data_base64: largeWebp.toString('base64'),
            original_name: 'profile_large.webp',
            visibility: 'public_read',
            customKey: largePath,
            target: 'cloudinary',
        });
        const mediumUpload = await this.storage.upload({
            owner_account_id: job.owner_id,
            owner_kind: 'provider_account',
            mime: 'image/webp',
            data_base64: mediumWebp.toString('base64'),
            original_name: 'profile_medium.webp',
            visibility: 'public_read',
            customKey: mediumPath,
            target: 'cloudinary',
        });
        const smallUpload = await this.storage.upload({
            owner_account_id: job.owner_id,
            owner_kind: 'provider_account',
            mime: 'image/webp',
            data_base64: smallWebp.toString('base64'),
            original_name: 'profile_thumbnail.webp',
            visibility: 'public_read',
            customKey: smallPath,
            target: 'cloudinary',
        });
        const originalUrl = originalUpload.id;
        const processedUrl = largeUpload.id;
        const mediumUrl = mediumUpload.id;
        const thumbnailUrl = smallUpload.id;
        await this.metadataModel.updateOne({ owner_id: job.owner_id }, {
            $set: {
                originalImageUrl: originalUrl,
                processedImageUrl: processedUrl,
                mediumImageUrl: mediumUrl,
                thumbnailImageUrl: thumbnailUrl,
                hasTransparentBackground: hasAlpha,
                processingStatus: 'completed',
                lastProcessedAt: new Date(),
            },
        });
        await this.profileModel.updateOne({ account_id: job.owner_id }, { $set: { profile_image_id: processedUrl } });
        job.status = 'completed';
        job.processedAt = new Date();
        await job.save();
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
    async reprocessImage(ownerId) {
        const job = await this.jobModel.findOne({ owner_id: ownerId }).sort({ createdAt: -1 });
        if (!job)
            throw new common_1.BadRequestException('No previous upload found to reprocess');
        job.status = 'pending';
        job.error = undefined;
        await job.save();
        await this.metadataModel.updateOne({ owner_id: ownerId }, { $set: { processingStatus: 'pending', error: undefined } });
        return { ok: true, status: 'pending' };
    }
    async replaceImage(ownerId, base64, mime) {
        await this.enqueueJob({
            owner_id: ownerId,
            owner_type: 'doctor',
            data_base64: base64,
            mime,
            original_name: 'replaced_profile.png',
        });
        return { ok: true, status: 'pending' };
    }
    async retryFailedJobs(ownerId) {
        const failedJobs = await this.jobModel.find({ owner_id: ownerId, status: 'failed' });
        for (const job of failedJobs) {
            job.status = 'pending';
            job.error = undefined;
            await job.save();
        }
        await this.metadataModel.updateOne({ owner_id: ownerId }, { $set: { processingStatus: 'pending', error: undefined } });
        return { ok: true, retriedCount: failedJobs.length };
    }
    async getImageLogs(ownerId) {
        return this.auditLogModel.find({ user_id: ownerId }).sort({ createdAt: -1 });
    }
};
exports.ProviderImageProcessorService = ProviderImageProcessorService;
__decorate([
    (0, schedule_1.Cron)('*/10 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProviderImageProcessorService.prototype, "processPendingJobs", null);
exports.ProviderImageProcessorService = ProviderImageProcessorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProfileImageMetadataRepository')),
    __param(1, (0, common_1.Inject)('ImageProcessingJobRepository')),
    __param(2, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(3, (0, common_1.Inject)('ProfileImageAuditLogRepository')),
    __metadata("design:paramtypes", [profileimagemetadata_repository_1.ProfileImageMetadataRepository,
        imageprocessingjob_repository_1.ImageProcessingJobRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        profileimageauditlog_repository_1.ProfileImageAuditLogRepository,
        storage_module_1.StorageService])
], ProviderImageProcessorService);
//# sourceMappingURL=provider-image-processor.service.js.map