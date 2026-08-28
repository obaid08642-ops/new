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
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
let MediaService = MediaService_1 = class MediaService {
    constructor() {
        this.logger = new common_1.Logger(MediaService_1.name);
        const endpoint = process.env.S3_ENDPOINT
            || (process.env.CLOUDFLARE_R2_ACCOUNT_ID ? `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
        const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
        const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
        this.bucketName = process.env.S3_BUCKET || process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
        this.configured = Boolean(endpoint && accessKeyId && secretAccessKey && this.bucketName);
        if (!this.configured) {
            this.logger.error('Media storage is not configured (S3_* env missing) — uploads and signed URLs fail closed.');
        }
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.S3_REGION || 'auto',
            endpoint: endpoint || 'https://invalid.invalid',
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
        });
    }
    assertConfigured() {
        if (!this.configured)
            throw new common_1.ServiceUnavailableException('media_storage_not_configured');
    }
    async uploadBuffer(buffer, originalName, mimeType, folder = 'general') {
        this.assertConfigured();
        const extension = originalName.split('.').pop() || '';
        const key = `${folder}/${(0, uuid_1.v4)()}.${extension}`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
            });
            await this.s3Client.send(command);
            return { key };
        }
        catch (error) {
            this.logger.error(`Failed to upload private file to R2: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('media_upload_failed');
        }
    }
    async generatePresignedDownloadUrl(key, expiresIn = 15 * 60) {
        this.assertConfigured();
        try {
            return await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, new client_s3_1.GetObjectCommand({ Bucket: this.bucketName, Key: key }), { expiresIn });
        }
        catch (error) {
            this.logger.error(`Failed to generate private download URL: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('media_url_generation_failed');
        }
    }
    async generatePresignedUploadUrl(originalName, mimeType, folder = 'general', expiresIn = 15 * 60) {
        this.assertConfigured();
        const extension = originalName.split('.').pop() || '';
        const key = `${folder}/${(0, uuid_1.v4)()}.${extension}`;
        try {
            const command = new client_s3_1.PutObjectCommand({ Bucket: this.bucketName, Key: key, ContentType: mimeType });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: Math.min(Math.max(expiresIn, 60), 15 * 60) });
            return { uploadUrl, key };
        }
        catch (error) {
            this.logger.error(`Failed to generate private presigned upload URL: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('media_upload_url_generation_failed');
        }
    }
    async deleteFile(key) {
        this.assertConfigured();
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
        }
        catch (error) {
            this.logger.error(`Failed to delete file from R2: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`File deletion failed: ${error.message}`);
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MediaService);
//# sourceMappingURL=media.service.js.map