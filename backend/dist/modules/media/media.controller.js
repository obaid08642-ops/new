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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const media_service_1 = require("./media.service");
const media_schema_1 = require("./media.schema");
let MediaController = class MediaController {
    constructor(mediaService, assets, connection) {
        this.mediaService = mediaService;
        this.assets = assets;
        this.connection = connection;
    }
    async uploadFile(user, file, purpose, threadId) {
        if (!file)
            throw new common_1.BadRequestException('file_required');
        await this.assertUploadAllowed(user, purpose, threadId);
        const uploaded = await this.mediaService.uploadBuffer(file.buffer, file.originalname, file.mimetype, `${purpose}/${user.id}`);
        try {
            const asset = await this.assets.create({
                key: uploaded.key, owner_id: user.id, purpose, thread_id: threadId,
                original_name: file.originalname, mime_type: file.mimetype, size_bytes: file.size,
            });
            return { id: asset.id, purpose: asset.purpose, thread_id: asset.thread_id || null };
        }
        catch (error) {
            await this.mediaService.deleteFile(uploaded.key).catch(() => null);
            throw error;
        }
    }
    async getPresignedUrl(user, filename, mimetype, purpose, threadId) {
        if (!filename || !mimetype)
            throw new common_1.BadRequestException('filename_and_mimetype_required');
        const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp3|m4a|wav|doc|docx|xls|xlsx)$/i;
        if (!filename.match(allowedExtensions))
            throw new common_1.BadRequestException('unsupported_media_extension');
        await this.assertUploadAllowed(user, purpose, threadId);
        const upload = await this.mediaService.generatePresignedUploadUrl(filename, mimetype, `${purpose}/${user.id}`);
        const asset = await this.assets.create({
            key: upload.key, owner_id: user.id, purpose, thread_id: threadId,
            original_name: filename, mime_type: mimetype,
        });
        return { id: asset.id, upload_url: upload.uploadUrl, expires_in: 900 };
    }
    async signedUrl(user, id) {
        const asset = await this.assets.findOne({ id }).lean();
        if (!asset)
            throw new common_1.NotFoundException('media_not_found');
        if (!await this.canReadAsset(asset, user))
            throw new common_1.NotFoundException('media_not_found');
        return { url: await this.mediaService.generatePresignedDownloadUrl(asset.key, 15 * 60), expires_in: 900 };
    }
    async assertUploadAllowed(user, purpose, threadId) {
        if (!media_schema_1.MEDIA_PURPOSES.includes(purpose))
            throw new common_1.BadRequestException('invalid_media_purpose');
        if (purpose === 'chat') {
            if (!threadId)
                throw new common_1.BadRequestException('thread_id_required_for_chat_media');
            await this.verifyChatUploadAllowed(threadId, user.id);
        }
        else if (threadId) {
            throw new common_1.BadRequestException('thread_id_only_supported_for_chat_media');
        }
    }
    async canReadAsset(asset, user) {
        if (asset.owner_id === user?.id)
            return true;
        if (asset.purpose !== 'chat' || !asset.thread_id)
            return false;
        try {
            const ChatThreadModel = this.connection.model('ChatThread');
            const thread = await ChatThreadModel.findOne({ id: asset.thread_id, participant_ids: user.id });
            return Boolean(thread);
        }
        catch {
            return false;
        }
    }
    async verifyChatUploadAllowed(threadId, userId) {
        try {
            const ChatThreadModel = this.connection.model('ChatThread');
            const thread = await ChatThreadModel.findOne({ id: threadId, participant_ids: userId });
            if (!thread)
                throw new common_1.NotFoundException('thread_not_found');
            if (thread.participant_ids && thread.participant_ids.length >= 2) {
                const userA = thread.participant_ids[0];
                const userB = thread.participant_ids[1];
                const FamilyGroupModel = this.connection.model('FamilyGroup');
                const count = await FamilyGroupModel.countDocuments({
                    is_deleted: { $ne: true },
                    'members.user_id': { $all: [userA, userB] }
                });
                if (count > 0)
                    return;
            }
            if (thread.type === 'booking' && thread.booking_kind === 'consultation') {
                if (!thread.booking_id) {
                    throw new common_1.ForbiddenException('معرف الحجز غير موجود.');
                }
                const AppointmentModel = this.connection.model('Appointment');
                const appt = await AppointmentModel.findOne({ id: thread.booking_id });
                if (!appt) {
                    throw new common_1.ForbiddenException('لم يتم العثور على الاستشارة المرتبطة.');
                }
                if (appt.status === 'PENDING') {
                    throw new common_1.ForbiddenException('لم تبدأ الاستشارة بعد. لا يمكنك رفع ملفات.');
                }
                if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
                    throw new common_1.ForbiddenException('الاستشارة مغلقة ولا يمكن رفع ملفات.');
                }
                if (appt.status === 'COMPLETED') {
                    const SystemConfigModel = this.connection.model('SystemConfig');
                    const sysConfig = await SystemConfigModel.findOne({ key: 'system_config' });
                    const followupHours = sysConfig?.value?.consultation_followup_hours ?? 24;
                    const endedAt = appt.completed_at || appt.updatedAt || new Date();
                    const elapsedHours = (Date.now() - new Date(endedAt).getTime()) / (1000 * 60 * 60);
                    if (elapsedHours > followupHours) {
                        throw new common_1.ForbiddenException('انتهت فترة المتابعة الخاصة بالاستشارة ولا يمكنك رفع ملفات جديدة.');
                    }
                }
            }
        }
        catch (err) {
            if (err instanceof common_1.ForbiddenException || err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.BadRequestException('chat_media_authorization_unavailable');
        }
    }
    async deleteFile(key) {
        const keyStr = Array.isArray(key) ? key.join('/') : key;
        if (!keyStr) {
            throw new common_1.BadRequestException('key is required');
        }
        await this.mediaService.deleteFile(keyStr);
        return { success: true };
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 15 * 1024 * 1024 },
        fileFilter: (req, file, callback) => {
            const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|mp3|m4a|wav|doc|docx|xls|xlsx)$/i;
            if (!file.originalname.match(allowedExtensions)) {
                return callback(new common_1.BadRequestException('Only approved image, PDF, audio, and document files are allowed!'), false);
            }
            callback(null, true);
        },
    })),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('purpose')),
    __param(3, (0, common_1.Body)('thread_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)('presigned'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('filename')),
    __param(2, (0, common_1.Body)('mimetype')),
    __param(3, (0, common_1.Body)('purpose')),
    __param(4, (0, common_1.Body)('thread_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getPresignedUrl", null);
__decorate([
    (0, common_1.Get)(':id/url'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "signedUrl", null);
__decorate([
    (0, common_1.Delete)('*key'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteFile", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(1, (0, mongoose_1.InjectModel)(media_schema_1.MediaAsset.name)),
    __param(2, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [media_service_1.MediaService,
        mongoose_2.Model,
        mongoose_2.Connection])
], MediaController);
//# sourceMappingURL=media.controller.js.map