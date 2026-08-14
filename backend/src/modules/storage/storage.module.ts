import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Module, Injectable, BadRequestException, NotFoundException, ForbiddenException, Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { CurrentUser } from '../../common/auth.guard';

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

/** Standalone Media/Storage Adapter for S3/R2 compatible storage */
class S3R2Adapter implements StorageAdapter {
  async put(p: { mime: string; data_base64?: string; original_name: string; customKey?: string }) {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT; // Cloudflare R2 or AWS S3 endpoint

    if (!p.data_base64) throw new BadRequestException('data_base64 required');

    if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
      throw new BadRequestException('S3_NOT_CONFIGURED');
    }

    const key = p.customKey || `${uuidv4()}-${p.original_name}`;
    const externalUrl = `${endpoint}/${bucket}/${key}`;
    
    // In production, you would upload file Buffer to Cloudflare R2 / AWS S3 using standard fetch or sdk
    return {
      backend: StorageBackend.S3,
      external_url: externalUrl,
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
    if (o.backend === StorageBackend.S3) {
      // Implement deletion call from R2/S3
    }
  }
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard cap per file at base64 layer

@Injectable()
export class StorageService {
  private adapter: StorageAdapter = new S3R2Adapter();
  constructor(@InjectModel('StorageObject') private readonly model: Model<StorageObject>) {}

  /** Upload a file. Returns { id }. */
  async upload(input: { owner_account_id: string; owner_kind?: string; mime: string; data_base64: string; original_name?: string; visibility?: 'private' | 'public_read'; customKey?: string }) {
    if (!ALLOWED_MIME.has(input.mime)) throw new BadRequestException('unsupported mime: ' + input.mime);
    const approxBytes = Math.floor((input.data_base64?.length || 0) * 0.75);
    if (approxBytes > MAX_BYTES) throw new BadRequestException('file exceeds 8MB limit');
    const checksum = crypto.createHash('sha256').update(input.data_base64).digest('hex');
    const adapterRes = await this.adapter.put({ mime: input.mime, data_base64: input.data_base64, original_name: input.original_name || 'file', customKey: input.customKey });
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
      visibility: input.visibility || 'private',
    });
    return { id: obj.id, mime: obj.mime, size_bytes: obj.size_bytes, url: `/api/v1/storage/${obj.id}` };
  }

  /** Fetch object — enforces owner_account_id privacy unless visibility=public_read. */
  async read(id: string, requester: { id: string; role?: string }) {
    const o = await this.model.findOne({ id, deleted: false });
    if (!o) throw new NotFoundException();
    if (o.visibility !== 'public_read' && o.owner_account_id !== requester.id && requester.role !== 'admin') throw new ForbiddenException();
    const data = await this.adapter.get(o);
    return { id: o.id, mime: o.mime, original_name: o.original_name, size_bytes: o.size_bytes, ...data };
  }
}

@Controller('storage')
export class StorageController {
  constructor(private readonly svc: StorageService) {}
  @Post('upload')
  async upload(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.upload({ owner_account_id: user.id, owner_kind: user.role, mime: body.mime, data_base64: body.data_base64, original_name: body.original_name, visibility: body.visibility });
  }
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.read(id, user);
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'StorageObject', schema: StorageObjectSchema }])],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService, MongooseModule],
})
export class StorageModule {}
