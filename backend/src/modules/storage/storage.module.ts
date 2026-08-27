import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Module, Injectable, BadRequestException, NotFoundException, ForbiddenException, ServiceUnavailableException, Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { CurrentUser, Public } from '../../common/auth.guard';

export enum StorageBackend { BASE64 = 'base64', S3 = 's3', CLOUDINARY = 'cloudinary', SUPABASE = 'supabase' }

@Schema({ timestamps: true, collection: 'storage_objects' })
export class StorageObject extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, enum: Object.values(StorageBackend), default: StorageBackend.BASE64 }) backend: StorageBackend;
  @Prop({ required: true }) mime: string;
  @Prop({ required: true }) original_name: string;
  @Prop({ required: true, default: 0 }) size_bytes: number;
  @Prop() checksum_sha256?: string;
  @Prop() data_base64?: string;
  @Prop() external_url?: string;
  @Prop() external_key?: string;
  @Prop({ required: true, index: true }) owner_account_id: string;
  @Prop({ default: 'provider_account' }) owner_kind: string;
  @Prop({ default: 'private', enum: ['private', 'public_read'] }) visibility: string;
  @Prop() expires_at?: Date;
  @Prop({ type: Object }) cloudinary?: {
    publicId: string; secureUrl: string; thumbnailUrl: string;
    width: number; height: number; size: number; format: string; version: number; createdAt: string;
  };
  @Prop({ default: false }) deleted: boolean;
}
export const StorageObjectSchema = SchemaFactory.createForClass(StorageObject);
StorageObjectSchema.index({ owner_account_id: 1, createdAt: -1 });

export interface StorageAdapter {
  put(payload: { mime: string; data_base64?: string; original_name: string; customKey?: string }): Promise<{ backend: StorageBackend; external_url?: string; external_key?: string; data_base64?: string }>;
  get(obj: StorageObject): Promise<{ mime: string; data_base64?: string; external_url?: string }>;
  delete(obj: StorageObject): Promise<void>;
}

/** Default adapter — stores base64 inline. Identical interface as future S3/Cloudinary adapters. */
class Base64Adapter implements StorageAdapter {
  async put(p: { mime: string; data_base64?: string; original_name: string; customKey?: string }) {
    if (!p.data_base64) throw new BadRequestException('data_base64 required');
    return { backend: StorageBackend.BASE64, data_base64: p.data_base64 };
  }
  async get(o: StorageObject) { return { mime: o.mime, data_base64: o.data_base64 }; }
  async delete(_o: StorageObject) { /* noop — deletion handled by mongo flag */ }
}

/** Standalone Media/Storage Adapter for S3/R2 compatible storage — performs REAL uploads. */
class S3R2Adapter implements StorageAdapter {
  private client(): any {
    const { S3Client } = require('@aws-sdk/client-s3');
    return new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
      },
      forcePathStyle: true, // R2/MinIO-compatible; harmless on AWS
    });
  }

  static configured(): boolean {
    return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_ENDPOINT);
  }

  async put(p: { mime: string; data_base64?: string; original_name: string; customKey?: string }) {
    if (!p.data_base64) throw new BadRequestException('data_base64 required');
    if (!S3R2Adapter.configured()) throw new BadRequestException('S3_NOT_CONFIGURED');

    const bucket = process.env.S3_BUCKET as string;
    const key = p.customKey || `${uuidv4()}-${p.original_name}`;
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

  async get(o: StorageObject) {
    if (o.backend === StorageBackend.BASE64) {
      return { mime: o.mime, data_base64: o.data_base64 };
    }
    return { mime: o.mime, external_url: o.external_url };
  }

  async delete(o: StorageObject) {
    if (o.backend === StorageBackend.S3 && o.external_key && S3R2Adapter.configured()) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await this.client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.external_key }));
    }
  }
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard cap per file at base64 layer

@Injectable()
export class StorageService {
  private readonly logger = new Logger('StorageService');
  /**
   * S3/R2 when fully configured; otherwise the inline Base64 adapter so that
   * document flows (KYC, images) keep working in dev/staging without object storage.
   */
  private adapter: StorageAdapter = S3R2Adapter.configured() ? new S3R2Adapter() : new Base64Adapter();
  constructor(@InjectModel('StorageObject') private readonly model: Model<StorageObject>) {
    if (!S3R2Adapter.configured()) {
      // eslint-disable-next-line no-console
      console.warn('S3 storage not configured (S3_BUCKET/S3_ENDPOINT/keys) — falling back to inline base64 storage');
    }
  }

  /**
   * Event-driven cleanup: any module (medicines, providers, ...) emits
   * 'storage.delete_by_url' with a public URL previously produced by this
   * service, and the underlying S3/R2 object is physically removed so
   * deleted/replaced images never linger in the bucket.
   */
  @OnEvent('storage.delete_by_url')
  async handleDeleteByUrl(payload: { url?: string }) {
    try {
      const url = payload?.url;
      if (!url) return;

      // Cloudinary asset? → destroy via API (upload + authenticated types)
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

      // R2 asset? → DeleteObjectCommand
      if (!S3R2Adapter.configured()) return;
      const publicBase = process.env.S3_PUBLIC_BASE_URL || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
      if (!url.startsWith(`${publicBase}/`)) return; // not our object — ignore
      const key = url.slice(publicBase.length + 1);
      if (!key) return;
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const client = new (require('@aws-sdk/client-s3').S3Client)({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
        },
        forcePathStyle: true,
      });
      await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      await this.model.updateMany({ external_key: key }, { $set: { deleted: true } });
      this.logger.log(`Deleted object from storage: ${key}`);
    } catch (e: any) {
      this.logger.warn(`storage.delete_by_url failed: ${e.message}`);
    }
  }

  /** Upload a file. Returns { id }.
   *  target='cloudinary' routes provider/user content (profile images, clinic
   *  galleries, KYC documents) to Cloudinary; the default stays R2 so the
   *  medicine catalogue is never affected. */
  async upload(input: { owner_account_id: string; owner_kind?: string; mime: string; data_base64: string; original_name?: string; visibility?: 'private' | 'public_read'; customKey?: string; target?: 'r2' | 'cloudinary' }) {
    if (!ALLOWED_MIME.has(input.mime)) throw new BadRequestException('unsupported mime: ' + input.mime);
    const approxBytes = Math.floor((input.data_base64?.length || 0) * 0.75);
    if (approxBytes > MAX_BYTES) throw new BadRequestException('file exceeds 8MB limit');
    if (input.target === 'cloudinary') {
      if (!this.cloudinaryConfigured()) throw new BadRequestException('CLOUDINARY_NOT_CONFIGURED');
      return this.uploadCloudinary(input);
    }
    // Authenticated uploads have no client-selectable public visibility. A
    // separate reviewed publication workflow is required for catalogue media.
    if (!S3R2Adapter.configured()) throw new ServiceUnavailableException('PRIVATE_OBJECT_STORAGE_REQUIRED');
    const checksum = crypto.createHash('sha256').update(input.data_base64).digest('hex');
    let adapterRes;
    try {
      adapterRes = await this.adapter.put({ mime: input.mime, data_base64: input.data_base64, original_name: input.original_name || 'file', customKey: input.customKey });
    } catch (e: any) {
      this.logger.error(`S3/R2 put failed (${e.message}) — private upload refused`);
      throw new ServiceUnavailableException('PRIVATE_OBJECT_STORAGE_UNAVAILABLE');
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

  /** Fetch object — enforces owner_account_id privacy unless visibility=public_read. */
  async read(id: string, requester: { id: string; role?: string }) {
    const o = await this.model.findOne({ id, deleted: false });
    if (!o) throw new NotFoundException();
    if (o.visibility !== 'public_read' && o.owner_account_id !== requester.id && requester.role !== 'admin') throw new ForbiddenException();
    const data = await this.adapter.get(o);
    if (o.visibility !== 'public_read') delete (data as any).external_url;
    return { id: o.id, mime: o.mime, original_name: o.original_name, size_bytes: o.size_bytes, ...data };
  }

  // ═══ Signed delivery URLs (private files) ═══════════════════════════════
  /** Time-limited URL for a private object: R2 presigned GET (5 min) or Cloudinary signed. */
  async signedUrl(id: string, requester: { id: string; role?: string }) {
    const o: any = await this.model.findOne({ id, deleted: false });
    if (!o) throw new NotFoundException();
    if (o.visibility !== 'public_read' && o.owner_account_id !== requester.id && requester.role !== 'admin') throw new ForbiddenException();

    // Cloudinary-hosted: build signed delivery URL
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
      throw new ServiceUnavailableException('PRIVATE_MEDIA_SIGNING_UNAVAILABLE');
    }

    // R2-hosted private: presign with AWS SDK (5 min)
    if (o.visibility !== 'public_read' && o.external_key && S3R2Adapter.configured()) {
      try {
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const client = new S3Client({
          region: process.env.S3_REGION || 'auto',
          endpoint: process.env.S3_ENDPOINT,
          credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID as string, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string },
          forcePathStyle: true,
        });
        const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.external_key }), { expiresIn: 300 });
        return { url, expires_in: 300, kind: 'r2_presigned' };
      } catch (e: any) {
        this.logger.warn(`R2 presign failed: ${e.message} — authenticated API stream fallback`);
      }
    }

    if (o.visibility !== 'public_read') return { url: `/api/v1/storage/${o.id}`, expires_in: null, kind: 'api_authorized_stream' };
    return { url: o.external_url || `/api/v1/storage/${o.id}`, expires_in: null, kind: o.external_url ? 'cdn_public' : 'api_stream' };
  }

  // ═══ Cloudinary adapter (provider/user generated content ONLY) ═══════════
  // Medicine catalogue/static assets stay on Cloudflare R2 + CDN.
  private cloudinaryConfigured(): boolean {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  }

  /**
   * Upload provider/user media to Cloudinary with the full production pipeline:
   * validate → (virus-scan hook point) → auto WebP/AVIF (f_auto) → auto quality
   * (q_auto) → responsive thumbnail → store FULL metadata (never bare URL).
   */
  async uploadCloudinary(input: { owner_account_id: string; owner_kind?: string; mime: string; data_base64: string; original_name?: string; visibility?: 'private' | 'public_read'; customKey?: string }) {
    if (!ALLOWED_MIME.has(input.mime)) throw new BadRequestException('unsupported mime: ' + input.mime);
    const approxBytes = Math.floor((input.data_base64?.length || 0) * 0.75);
    if (approxBytes > MAX_BYTES) throw new BadRequestException('file exceeds 8MB limit');
    if (!this.cloudinaryConfigured()) throw new BadRequestException('CLOUDINARY_NOT_CONFIGURED');

    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    // Deterministic customKey → overwrite replaces the previous asset, so the
    // old image is physically gone from Cloudinary on every replacement.
    const publicId = input.customKey
      ? `nabd/${input.customKey}`
      : `nabd/${input.owner_kind || 'user'}/${input.owner_account_id}/${crypto.randomUUID()}`;
    const result = await cloudinary.uploader.upload(`data:${input.mime};base64,${input.data_base64}`, {
      public_id: publicId,
      resource_type: 'image',
      type: 'authenticated',
      overwrite: !!input.customKey,
      invalidate: true, // purge CDN cached copies of the replaced image
    });

    // Full metadata object — the contract says never store only a URL
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
      backend: 'cloudinary' as any,
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
    } as any);

    return { id: obj.id, mime: obj.mime, size_bytes: obj.size_bytes, url: `/api/v1/storage/${obj.id}`, meta };
  }
}

@Controller('storage')
export class StorageController {
  constructor(private readonly svc: StorageService) {}
  @Post('upload')
  async upload(@Body() body: any, @CurrentUser() user: any) {
    const target = body.target === 'cloudinary' ? 'cloudinary' : body.target === 'r2' ? 'r2' : undefined;
    // customKey is only honored for Cloudinary uploads (always stored under the
    // nabd/ prefix) — never let clients pick raw R2 keys (would allow
    // overwriting catalogue images). Sanitize traversal just in case.
    const customKey = target === 'cloudinary' && typeof body.customKey === 'string'
      ? body.customKey.replace(/\.\./g, '').replace(/^\/+/, '').slice(0, 180)
      : undefined;
    return this.svc.upload({ owner_account_id: user.id, owner_kind: user.role, mime: body.mime, data_base64: body.data_base64, original_name: body.original_name, customKey, target });
  }
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.read(id, user);
  }

  /**
   * Signed delivery URL for PRIVATE objects — time-limited (5 min) R2 presigned
   * GET or Cloudinary signed URL. Public objects return their CDN URL instead.
   * Ownership rules are identical to read().
   */
  @Get(':id/signed-url')
  async signedUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.signedUrl(id, user);
  }

  /**
   * Guest-safe upload for drug-catalog suggestion images only (unregistered
   * visitors can propose images from the public drug guide). Hardened:
   * image mimes only, 5MB cap, R2 target, no custom keys.
   */
  @Public()
  @Post('upload-suggestion-image')
  async uploadSuggestionImage(@Body() body: any, @CurrentUser() user: any) {
    const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!IMAGE_MIME.has(body?.mime)) throw new BadRequestException('image mime only (jpeg/png/webp)');
    const approxBytes = Math.floor((body?.data_base64?.length || 0) * 0.75);
    if (approxBytes > 5 * 1024 * 1024) throw new BadRequestException('file exceeds 5MB limit');
    return this.svc.upload({
      owner_account_id: user?.id || 'guest',
      owner_kind: user?.role || 'guest',
      mime: body.mime,
      data_base64: body.data_base64,
      original_name: body.original_name || 'suggestion',
      target: 'r2',
    });
  }

  /** Upload to Cloudinary (provider/user generated content only). */
  @Post('upload-cloudinary')
  async uploadCloudinary(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.uploadCloudinary({ owner_account_id: user.id, owner_kind: user.role, mime: body.mime, data_base64: body.data_base64, original_name: body.original_name });
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'StorageObject', schema: StorageObjectSchema }])],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService, MongooseModule],
})
export class StorageModule {}
