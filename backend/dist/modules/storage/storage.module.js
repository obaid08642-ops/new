"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = exports.StorageController = exports.StorageService = exports.StorageObjectSchema = exports.StorageObject = exports.StorageBackend = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const common_1 = require("@nestjs/common");
const mongoose_3 = require("@nestjs/mongoose");
const mongoose_4 = require("mongoose");
const crypto = __importStar(require("crypto"));
const event_emitter_1 = require("@nestjs/event-emitter");
const common_2 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
var StorageBackend;
(function (StorageBackend) {
    StorageBackend["BASE64"] = "base64";
    StorageBackend["S3"] = "s3";
    StorageBackend["CLOUDINARY"] = "cloudinary";
    StorageBackend["SUPABASE"] = "supabase";
})(StorageBackend || (exports.StorageBackend = StorageBackend = {}));
let StorageObject = class StorageObject extends mongoose_2.Document {
};
exports.StorageObject = StorageObject;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], StorageObject.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(StorageBackend), default: StorageBackend.BASE64 }),
    __metadata("design:type", String)
], StorageObject.prototype, "backend", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StorageObject.prototype, "mime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StorageObject.prototype, "original_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], StorageObject.prototype, "size_bytes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StorageObject.prototype, "checksum_sha256", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StorageObject.prototype, "data_base64", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StorageObject.prototype, "external_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StorageObject.prototype, "external_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], StorageObject.prototype, "owner_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'provider_account' }),
    __metadata("design:type", String)
], StorageObject.prototype, "owner_kind", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'private', enum: ['private', 'public_read'] }),
    __metadata("design:type", String)
], StorageObject.prototype, "visibility", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], StorageObject.prototype, "expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], StorageObject.prototype, "cloudinary", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], StorageObject.prototype, "deleted", void 0);
exports.StorageObject = StorageObject = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'storage_objects' })
], StorageObject);
exports.StorageObjectSchema = mongoose_1.SchemaFactory.createForClass(StorageObject);
exports.StorageObjectSchema.index({ owner_account_id: 1, createdAt: -1 });
class Base64Adapter {
    async put(p) {
        if (!p.data_base64)
            throw new common_1.BadRequestException('data_base64 required');
        return { backend: StorageBackend.BASE64, data_base64: p.data_base64 };
    }
    async get(o) { return { mime: o.mime, data_base64: o.data_base64 }; }
    async delete(_o) { }
}
class S3R2Adapter {
    client() {
        const { S3Client } = require('@aws-sdk/client-s3');
        return new S3Client({
            region: process.env.S3_REGION || 'auto',
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
        });
    }
    static configured() {
        return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_ENDPOINT);
    }
    async put(p) {
        if (!p.data_base64)
            throw new common_1.BadRequestException('data_base64 required');
        if (!S3R2Adapter.configured())
            throw new common_1.BadRequestException('S3_NOT_CONFIGURED');
        const bucket = process.env.S3_BUCKET;
        const key = p.customKey || `${(0, uuid_1.v4)()}-${p.original_name}`;
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        await this.client().send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: Buffer.from(p.data_base64, 'base64'),
            ContentType: p.mime,
        }));
        const publicBase = process.env.S3_PUBLIC_BASE_URL || `${process.env.S3_ENDPOINT}/${bucket}`;
        return {
            backend: StorageBackend.S3,
            external_url: `${publicBase}/${key}`,
            external_key: key,
        };
    }
    async get(o) {
        if (o.backend === StorageBackend.BASE64) {
            return { mime: o.mime, data_base64: o.data_base64 };
        }
        return { mime: o.mime, external_url: o.external_url };
    }
    async delete(o) {
        if (o.backend === StorageBackend.S3 && o.external_key && S3R2Adapter.configured()) {
            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
            await this.client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.external_key }));
        }
    }
}
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_BYTES = 25 * 1024 * 1024;
let StorageService = class StorageService {
    constructor(model) {
        this.model = model;
        this.logger = new common_2.Logger('StorageService');
        this.adapter = S3R2Adapter.configured() ? new S3R2Adapter() : new Base64Adapter();
        if (!S3R2Adapter.configured()) {
            console.warn('S3 storage not configured (S3_BUCKET/S3_ENDPOINT/keys) — falling back to inline base64 storage');
        }
    }
    async handleDeleteByUrl(payload) {
        try {
            const url = payload?.url;
            if (!url)
                return;
            if (url.includes('res.cloudinary.com') && this.cloudinaryConfigured()) {
                const obj = await this.model.findOne({ external_url: url });
                if (obj?.external_key) {
                    const cloudinary = require('cloudinary').v2;
                    cloudinary.config({
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key: process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET,
                    });
                    await cloudinary.uploader.destroy(obj.external_key).catch(() => null);
                    await this.model.updateOne({ _id: obj._id }, { $set: { deleted: true } });
                    this.logger.log(`Deleted Cloudinary asset: ${obj.external_key}`);
                }
                return;
            }
            if (!S3R2Adapter.configured())
                return;
            const publicBase = process.env.S3_PUBLIC_BASE_URL || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
            if (!url.startsWith(`${publicBase}/`))
                return;
            const key = url.slice(publicBase.length + 1);
            if (!key)
                return;
            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
            const client = new (require('@aws-sdk/client-s3').S3Client)({
                region: process.env.S3_REGION || 'auto',
                endpoint: process.env.S3_ENDPOINT,
                credentials: {
                    accessKeyId: process.env.S3_ACCESS_KEY_ID,
                    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
                },
                forcePathStyle: true,
            });
            await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
            await this.model.updateMany({ external_key: key }, { $set: { deleted: true } });
            this.logger.log(`Deleted object from storage: ${key}`);
        }
        catch (e) {
            this.logger.warn(`storage.delete_by_url failed: ${e.message}`);
        }
    }
    async upload(input) {
        if (!ALLOWED_MIME.has(input.mime))
            throw new common_1.BadRequestException('unsupported mime: ' + input.mime);
        const approxBytes = Math.floor((input.data_base64?.length || 0) * 0.75);
        if (approxBytes > MAX_BYTES)
            throw new common_1.BadRequestException('file exceeds 8MB limit');
        if (input.target === 'cloudinary') {
            if (!this.cloudinaryConfigured())
                throw new common_1.BadRequestException('CLOUDINARY_NOT_CONFIGURED');
            return this.uploadCloudinary(input);
        }
        if (!S3R2Adapter.configured())
            throw new common_1.ServiceUnavailableException('PRIVATE_OBJECT_STORAGE_REQUIRED');
        const checksum = crypto.createHash('sha256').update(input.data_base64).digest('hex');
        let adapterRes;
        try {
            adapterRes = await this.adapter.put({ mime: input.mime, data_base64: input.data_base64, original_name: input.original_name || 'file', customKey: input.customKey });
        }
        catch (e) {
            this.logger.error(`S3/R2 put failed (${e.message}) — private upload refused`);
            throw new common_1.ServiceUnavailableException('PRIVATE_OBJECT_STORAGE_UNAVAILABLE');
        }
        const obj = await this.model.create({
            backend: adapterRes.backend,
            mime: input.mime,
            original_name: input.original_name || 'file',
            size_bytes: approxBytes,
            checksum_sha256: checksum,
            data_base64: adapterRes.data_base64,
            external_url: adapterRes.external_url,
            external_key: adapterRes.external_key,
            owner_account_id: input.owner_account_id,
            owner_kind: input.owner_kind || 'provider_account',
            visibility: 'private',
        });
        return { id: obj.id, mime: obj.mime, size_bytes: obj.size_bytes, url: `/api/v1/storage/${obj.id}` };
    }
    async read(id, requester) {
        const o = await this.model.findOne({ id, deleted: false });
        if (!o)
            throw new common_1.NotFoundException();
        if (o.visibility !== 'public_read' && o.owner_account_id !== requester.id && requester.role !== 'admin')
            throw new common_1.ForbiddenException();
        const data = await this.adapter.get(o);
        if (o.visibility !== 'public_read')
            delete data.external_url;
        return { id: o.id, mime: o.mime, original_name: o.original_name, size_bytes: o.size_bytes, ...data };
    }
    async signedUrl(id, requester) {
        const o = await this.model.findOne({ id, deleted: false });
        if (!o)
            throw new common_1.NotFoundException();
        if (o.visibility !== 'public_read' && o.owner_account_id !== requester.id && requester.role !== 'admin')
            throw new common_1.ForbiddenException();
        if (o.backend === 'cloudinary' && o.external_key) {
            if (process.env.CLOUDINARY_API_SECRET) {
                const cloudinary = require('cloudinary').v2;
                cloudinary.config({
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    api_secret: process.env.CLOUDINARY_API_SECRET,
                });
                const url = cloudinary.url(o.external_key, {
                    sign_url: true, secure: true, type: o.visibility === 'public_read' ? 'upload' : 'authenticated',
                    transformation: [{ fetch_format: 'auto', quality: 'auto' }],
                    expires_at: Math.floor(Date.now() / 1000) + 300,
                });
                return { url, expires_in: 300, kind: 'cloudinary_signed' };
            }
            throw new common_1.ServiceUnavailableException('PRIVATE_MEDIA_SIGNING_UNAVAILABLE');
        }
        if (o.visibility !== 'public_read' && o.external_key && S3R2Adapter.configured()) {
            try {
                const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
                const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
                const client = new S3Client({
                    region: process.env.S3_REGION || 'auto',
                    endpoint: process.env.S3_ENDPOINT,
                    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
                    forcePathStyle: true,
                });
                const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.external_key }), { expiresIn: 300 });
                return { url, expires_in: 300, kind: 'r2_presigned' };
            }
            catch (e) {
                this.logger.warn(`R2 presign failed: ${e.message} — authenticated API stream fallback`);
            }
        }
        if (o.visibility !== 'public_read')
            return { url: `/api/v1/storage/${o.id}`, expires_in: null, kind: 'api_authorized_stream' };
        return { url: o.external_url || `/api/v1/storage/${o.id}`, expires_in: null, kind: o.external_url ? 'cdn_public' : 'api_stream' };
    }
    cloudinaryConfigured() {
        return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    }
    async uploadCloudinary(input) {
        if (!ALLOWED_MIME.has(input.mime))
            throw new common_1.BadRequestException('unsupported mime: ' + input.mime);
        const approxBytes = Math.floor((input.data_base64?.length || 0) * 0.75);
        if (approxBytes > MAX_BYTES)
            throw new common_1.BadRequestException('file exceeds 8MB limit');
        if (!this.cloudinaryConfigured())
            throw new common_1.BadRequestException('CLOUDINARY_NOT_CONFIGURED');
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
        const publicId = input.customKey
            ? `nabd/${input.customKey}`
            : `nabd/${input.owner_kind || 'user'}/${input.owner_account_id}/${crypto.randomUUID()}`;
        const result = await cloudinary.uploader.upload(`data:${input.mime};base64,${input.data_base64}`, {
            public_id: publicId,
            resource_type: 'image',
            type: 'authenticated',
            overwrite: !!input.customKey,
            invalidate: true,
        });
        const meta = {
            publicId: result.public_id,
            secureUrl: result.secure_url,
            thumbnailUrl: cloudinary.url(result.public_id, { transformation: [{ width: 300, crop: 'thumb', fetch_format: 'auto', quality: 'auto' }] }),
            width: result.width,
            height: result.height,
            size: result.bytes,
            format: result.format,
            version: result.version,
            createdAt: result.created_at,
        };
        const obj = await this.model.create({
            backend: 'cloudinary',
            mime: input.mime,
            original_name: input.original_name || 'file',
            size_bytes: approxBytes,
            checksum_sha256: crypto.createHash('sha256').update(input.data_base64).digest('hex'),
            external_url: meta.secureUrl,
            external_key: meta.publicId,
            owner_account_id: input.owner_account_id,
            owner_kind: input.owner_kind || 'provider_account',
            visibility: 'private',
            cloudinary: meta,
        });
        return { id: obj.id, mime: obj.mime, size_bytes: obj.size_bytes, url: `/api/v1/storage/${obj.id}`, meta };
    }
};
exports.StorageService = StorageService;
__decorate([
    (0, event_emitter_1.OnEvent)('storage.delete_by_url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StorageService.prototype, "handleDeleteByUrl", null);
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_3.InjectModel)('StorageObject')),
    __metadata("design:paramtypes", [mongoose_4.Model])
], StorageService);
let StorageController = class StorageController {
    constructor(svc) {
        this.svc = svc;
    }
    async upload(body, user) {
        if (!user?.id)
            throw new common_1.ForbiddenException('authenticated_upload_required');
        return this.svc.upload({
            owner_account_id: user.id,
            owner_kind: user.role || 'provider_account',
            mime: body.mime,
            data_base64: body.data_base64,
            original_name: body.original_name,
            target: 'r2',
        });
    }
    async get(id, user) {
        return this.svc.read(id, user);
    }
    async signedUrl(id, user) {
        return this.svc.signedUrl(id, user);
    }
    async uploadSuggestionImage(body, user) {
        const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
        if (!IMAGE_MIME.has(body?.mime))
            throw new common_1.BadRequestException('image mime only (jpeg/png/webp)');
        const approxBytes = Math.floor((body?.data_base64?.length || 0) * 0.75);
        if (approxBytes > 5 * 1024 * 1024)
            throw new common_1.BadRequestException('file exceeds 5MB limit');
        return this.svc.upload({
            owner_account_id: user?.id || 'guest',
            owner_kind: user?.role || 'guest',
            mime: body.mime,
            data_base64: body.data_base64,
            original_name: body.original_name || 'suggestion',
            target: 'r2',
        });
    }
    uploadCloudinary() {
        throw new common_1.ServiceUnavailableException('cloudinary_upload_disabled_use_private_object_storage');
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Post)('upload'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/signed-url'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "signedUrl", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('upload-suggestion-image'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadSuggestionImage", null);
__decorate([
    (0, common_1.Post)('upload-cloudinary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "uploadCloudinary", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.Controller)('storage'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [StorageService])
], StorageController);
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_3.MongooseModule.forFeature([{ name: 'StorageObject', schema: exports.StorageObjectSchema }])],
        controllers: [StorageController],
        providers: [StorageService],
        exports: [StorageService, mongoose_3.MongooseModule],
    })
], StorageModule);
//# sourceMappingURL=storage.module.js.map