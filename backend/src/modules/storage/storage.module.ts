import { UserRateLimit, UserRateLimitGuard } from '../../common/user-rate-limit';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Module, Injectable, BadRequestException, NotFoundException, ForbiddenException, ServiceUnavailableException, Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { CurrentUser, Public, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { UploadDto, UploadSuggestionImageDto } from './storage.dto';
import { Purpose, UploadSecurityService } from './upload-security.service';
import { ClamavService } from './clamav.service';
import { logEvent } from '../../common/structured-logger';
import { PendingScanService } from './pending-scan.service';
import { FilePendingScanException, PENDING_PREFIX, isPendingKey, isUnscanned } from './pending-scan';

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
  /** Accounts the owner shared this file with (e.g. a nurse's visit attachments -> that booking's patient). */
  @Prop({ type: [String], default: undefined, index: true }) shared_with?: string[];
  @Prop() expires_at?: Date;
  @Prop({ type: Object }) cloudinary?: {
    publicId: string; secureUrl: string; thumbnailUrl: string;
    width: number; height: number; size: number; format: string; version: number; createdAt: string;
  };
  @Prop({ default: false }) deleted: boolean;
  /** UPLOAD_SCAN=defer: 'pending_scan' | 'scanning' until the worker has passed the file; absent on rows that were scanned before they were stored. */
  @Prop({ type: String, enum: ['pending_scan', 'scanning', 'clean', 'infected'] }) scan_status?: string;
  @Prop() scan_claimed_at?: Date;
  @Prop() scanned_at?: Date;
  @Prop({ default: undefined }) scan_attempts?: number;
}
export const StorageObjectSchema = SchemaFactory.createForClass(StorageObject);
StorageObjectSchema.index({ owner_account_id: 1, createdAt: -1 });
// the scan worker's queue: unscanned files, oldest first (sparse: rows scanned before they were stored never enter it)
StorageObjectSchema.index({ scan_status: 1, createdAt: 1 }, { sparse: true, name: 'scan_queue' });

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

/** Staff who review private documents (licences, KYC) besides their owner. super_admin was refused before. */
const STAFF_READERS = new Set(['admin', 'super_admin']);
function canRead(o: { visibility?: string; owner_account_id: string; shared_with?: string[] }, requester: { id: string; role?: string }) {
  return o.visibility === 'public_read'
    || o.owner_account_id === requester.id
    || (Array.isArray(o.shared_with) && o.shared_with.includes(requester.id))
    || STAFF_READERS.has(String(requester.role || '').toLowerCase());
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger('StorageService');
  /**
   * S3/R2 when fully configured; otherwise the inline Base64 adapter so that
   * document flows (KYC, images) keep working in dev/staging without object storage.
   */
  private adapter: StorageAdapter = S3R2Adapter.configured() ? new S3R2Adapter() : new Base64Adapter();
  constructor(
    @InjectModel('StorageObject') private readonly model: Model<StorageObject>,
    private readonly uploadSecurity: UploadSecurityService,
  ) {
    if (!S3R2Adapter.configured()) {
      // eslint-disable-next-line no-console
      logEvent('warn', 'storage_not_configured', { fallback: 'inline_base64', needs: 'S3_BUCKET/S3_ENDPOINT/keys' }, 'storage');
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

      // Cloudinary asset? → destroy via API (upload + authenticated types).
      // R4-2: exact hostname match — a substring check lets
      // evil-res.cloudinary.com.attacker.example pass.
      let isCloudinary = false;
      try {
        isCloudinary = new URL(url).hostname.toLowerCase() === 'res.cloudinary.com';
      } catch { isCloudinary = false; }
      if (isCloudinary && this.cloudinaryConfigured()) {
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

      // R2 asset? → DeleteObjectCommand. The saved URL is either the public CDN URL or a presigned URL on the
      // storage endpoint (D-32: the admin page saves what /storage/:id/signed-url returned); the query string
      // and fragment are not part of the key. Only objects of our own bucket are ever deleted.
      if (!S3R2Adapter.configured()) return;
      const clean = String(url).split('#')[0].split('?')[0];
      const bases = [process.env.S3_PUBLIC_BASE_URL, `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`]
        .filter((b): b is string => typeof b === 'string' && b.length > 0)
        .map((b) => b.replace(/\/+$/, ''));
      const base = bases.find((b) => clean.startsWith(`${b}/`));
      if (!base) return; // not our object — ignore
      let key = clean.slice(base.length + 1);
      try { key = decodeURIComponent(key); } catch { /* keep as is */ }
      if (!key || key.includes('..')) return;
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

  /**
   * D-32: storage objects replaced by newer ones. Each old row is marked deleted (its inline base64 dropped) and its
   * stored object removed, except when a new row holds the same key (an overwrite already replaced the content, and
   * deleting it would remove the new file).
   */
  async retire(oldIds: string[], newIds: string[] = []): Promise<number> {
    const ids = [...new Set(oldIds.filter((id) => typeof id === 'string' && id && !newIds.includes(id)))];
    if (!ids.length) return 0;
    const keep = new Set(
      (await this.model.find({ id: { $in: newIds.filter((id) => typeof id === 'string' && id) } }, { external_key: 1 }).lean())
        .map((r: any) => r.external_key).filter(Boolean),
    );
    const rows: any[] = await this.model.find({ id: { $in: ids }, deleted: { $ne: true } }).lean();
    for (const o of rows) {
      if (o.external_key && !keep.has(o.external_key)) {
        try {
          if (o.backend === 'cloudinary' && this.cloudinaryConfigured()) {
            const cloudinary = require('cloudinary').v2;
            cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
            await cloudinary.uploader.destroy(o.external_key, { type: 'authenticated', resource_type: 'image' }).catch(() => null);
          } else {
            await this.adapter.delete(o);
          }
        } catch (e: any) {
          this.logger.warn(`retire: object ${o.external_key} not deleted: ${e?.message}`);
        }
      }
      await this.model.updateOne({ id: o.id }, { $set: { deleted: true }, $unset: { data_base64: '' } });
    }
    return rows.length;
  }

  /** Upload a file. Returns { id }.
   *  target='cloudinary' routes provider/user content (profile images, clinic
   *  galleries, KYC documents) to Cloudinary; the default stays R2 so the
   *  medicine catalogue is never affected. */
  async upload(input: { owner_account_id: string; owner_kind?: string; mime: string; data_base64: string; original_name?: string; visibility?: 'private' | 'public_read'; customKey?: string; target?: 'r2' | 'cloudinary'; purpose?: Purpose; defer_ok?: boolean }) {
    if (!ALLOWED_MIME.has(input.mime)) throw new BadRequestException('unsupported mime: ' + input.mime);
    // 16.5: the type comes from the bytes, the name is random and EXIF/GPS never survives.
    const inspected = await this.uploadSecurity.inspect({
      purpose: input.purpose || 'lab_report',
      declared_mime: input.mime,
      data_base64: input.data_base64,
      original_name: input.original_name,
      // UPLOAD_SCAN=defer: a private object may wait in quarantine for its scan (a Cloudinary object cannot; it is served by Cloudinary)
      allow_defer: input.defer_ok === true && input.target !== 'cloudinary',
    });
    const deferred = inspected.scan === 'deferred';
    const dataBase64 = inspected.bytes.toString('base64');
    const approxBytes = inspected.size_bytes;
    if (approxBytes > MAX_BYTES) throw new BadRequestException('file exceeds the hard size limit');
    if (input.target === 'cloudinary') {
      if (!this.cloudinaryConfigured()) throw new BadRequestException('CLOUDINARY_NOT_CONFIGURED');
      return this.uploadCloudinary({ ...input, data_base64: dataBase64 });
    }
    // Authenticated uploads have no client-selectable public visibility. A
    // separate reviewed publication workflow is required for catalogue media.
    if (!S3R2Adapter.configured()) throw new ServiceUnavailableException('PRIVATE_OBJECT_STORAGE_REQUIRED');
    const checksum = crypto.createHash('sha256').update(inspected.bytes).digest('hex');
    let adapterRes;
    try {
      // quarantine: the object is written under `pending/` and nothing signs, links or reads a key under it until the scan worker moves it
      const key = input.customKey || `${uuidv4()}-${inspected.random_name}`;
      adapterRes = await this.adapter.put({ mime: input.mime, data_base64: dataBase64, original_name: inspected.random_name, customKey: deferred ? `${PENDING_PREFIX}${key}` : key });
    } catch (e: any) {
      this.logger.error(`S3/R2 put failed (${e.message}) — private upload refused`);
      throw new ServiceUnavailableException('PRIVATE_OBJECT_STORAGE_UNAVAILABLE');
    }
    const obj = await this.model.create({
      backend: adapterRes.backend,
      mime: input.mime,
      original_name: inspected.random_name,
      size_bytes: approxBytes,
      checksum_sha256: checksum,
      data_base64: adapterRes.data_base64,
      external_url: adapterRes.external_url,
      external_key: adapterRes.external_key,
      owner_account_id: input.owner_account_id,
      owner_kind: input.owner_kind || 'provider_account',
      visibility: 'private',
      ...(deferred ? { scan_status: 'pending_scan' } : {}),
    });
    return { id: obj.id, mime: obj.mime, size_bytes: obj.size_bytes, url: `/api/v1/storage/${obj.id}`, ...(deferred ? { scan_status: 'pending_scan' } : {}) };
  }

  /**
   * A-0: a pharmacy may open a patient's prescription file only when that file is attached to a
   * pharmacy order of the same patient AND the pharmacy was notified about that order (broadcast
   * recipient) or holds an allocation of it. Every other pharmacy keeps getting 403.
   */
  private async orderPharmacyMayRead(o: any, requester: { id: string; role?: string }): Promise<boolean> {
    if (!requester?.id || !o?.id || !o?.owner_account_id) return false;
    const db: any = (this.model as any).db;
    if (!db?.collection) return false;
    const uri = `/api/v1/storage/${encodeURIComponent(o.id)}`;
    const orders: any[] = await db.collection('pharmacy_orders')
      // a prescription file, or the photo of the box on a manual request (journeys 74)
      .find({ patient_account_id: { $eq: String(o.owner_account_id) }, $or: [{ 'prescription_attachments.uri': { $eq: uri } }, { 'items.photo_uri': { $eq: uri } }] }, { projection: { _id: 0, id: 1 } })
      .limit(50).toArray();
    const orderIds = orders.map((r) => r.id).filter((v) => typeof v === 'string');
    if (!orderIds.length) return false;
    const who = { order_id: { $in: orderIds }, pharmacy_account_id: { $eq: String(requester.id) } };
    if (await db.collection('pharmacy_broadcast_recipients').findOne(who, { projection: { _id: 1 } })) return true;
    return !!(await db.collection('pharmacy_allocations').findOne(who, { projection: { _id: 1 } }));
  }

  /**
   * Design parity (#1819): the patient of a radiology booking whose report is published may open that booking's report PDF,
   * DICOM study and scan images (the provider owns the objects). Every other object stays owner-only.
   */
  private async radiologyPatientMayRead(o: any, requester: { id: string; role?: string }): Promise<boolean> {
    if (!requester?.id || !o?.id) return false;
    const db: any = (this.model as any).db;
    if (!db?.collection) return false;
    const id = String(o.id);
    const hit = await db.collection('radiologybookings').findOne(
      { patient_id: { $eq: String(requester.id) }, state: { $eq: 'REPORT_READY' }, $or: [{ report_storage_object_id: { $eq: id } }, { dicom_storage_object_id: { $eq: id } }, { scan_storage_object_ids: { $eq: id } }] },
      { projection: { _id: 1 } },
    );
    return !!hit;
  }

  /** Fetch object — enforces owner_account_id privacy unless visibility=public_read. */
  async read(id: string, requester: { id: string; role?: string }) {
    const o = await this.model.findOne({ id, deleted: false });
    if (!o) throw new NotFoundException();
    if (!canRead(o, requester) && !(await this.orderPharmacyMayRead(o, requester)) && !(await this.radiologyPatientMayRead(o, requester))) throw new ForbiddenException();
    // a file that has not been scanned is not opened by anyone: not its owner, not staff
    if (isUnscanned(o.scan_status) || isPendingKey(o.external_key)) throw new FilePendingScanException();
    const data = await this.adapter.get(o);
    if (o.visibility !== 'public_read') delete (data as any).external_url;
    return { id: o.id, mime: o.mime, original_name: o.original_name, size_bytes: o.size_bytes, ...data };
  }

  /**
   * 2-web#3 / 2-app#13: an image of a PUBLIC profile (an approved doctor's photo or clinic photos). The caller (CareService)
   * has already checked that the id is one of that profile's images; this returns the bytes (local base64 store) or a short
   * link (public CDN, or a 5-minute presigned R2 link). Nothing else is ever served through it.
   */
  async publicProfileImage(id: string): Promise<{ mime: string; data?: Buffer; url?: string } | null> {
    const o: any = await this.model.findOne({ id, deleted: false }).lean();
    if (!o || !String(o.mime || '').startsWith('image/')) return null;
    if (isUnscanned(o.scan_status) || isPendingKey(o.external_key)) return null; // a public profile never shows a file that is still waiting for its scan
    if (o.backend === StorageBackend.BASE64 && o.data_base64) return { mime: o.mime, data: Buffer.from(o.data_base64, 'base64') };
    if (o.visibility === 'public_read' && o.external_url) return { mime: o.mime, url: o.external_url };
    if (o.external_key && S3R2Adapter.configured()) {
      try {
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const client = new S3Client({
          region: process.env.S3_REGION || 'auto',
          endpoint: process.env.S3_ENDPOINT,
          credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID as string, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string },
          forcePathStyle: true,
        });
        return { mime: o.mime, url: await getSignedUrl(client, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.external_key }), { expiresIn: 300 }) };
      } catch (e: any) {
        this.logger.warn(`profile image presign failed: ${e.message}`);
      }
    }
    return null;
  }

  // ═══ Signed delivery URLs (private files) ═══════════════════════════════
  /** Time-limited URL for a private object: R2 presigned GET (5 min) or Cloudinary signed. */
  async signedUrl(id: string, requester: { id: string; role?: string }) {
    const o: any = await this.model.findOne({ id, deleted: false });
    if (!o) throw new NotFoundException();
    if (!canRead(o, requester) && !(await this.orderPharmacyMayRead(o, requester)) && !(await this.radiologyPatientMayRead(o, requester))) throw new ForbiddenException();
    if (isUnscanned(o.scan_status) || isPendingKey(o.external_key)) throw new FilePendingScanException();

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
@SelfService()
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly svc: StorageService) {}
  // 16.12: an account may store 60 files an hour (USER_RATE_LIMIT_UPLOAD=<limit>/<seconds> tunes it)
  @Post('upload')
  @UseGuards(UserRateLimitGuard)
  @UserRateLimit('upload', 60, 3600)
  async upload(@Body() body: UploadDto, @CurrentUser() user: any) {
    if (!user?.id) throw new ForbiddenException('authenticated_upload_required');
    // Storage backend, object key, and visibility are server policy. The client
    // cannot route clinical/KYC data to Cloudinary or select a public endpoint.
    return this.svc.upload({
      owner_account_id: user.id,
      owner_kind: user.role || 'provider_account',
      mime: body.mime,
      data_base64: body.data_base64,
      original_name: body.original_name,
      target: 'r2',
      defer_ok: true, // UPLOAD_SCAN=defer: an account's own upload may wait in quarantine for its scan
    });
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
  @UseGuards(UserRateLimitGuard)
  @UserRateLimit('upload_suggestion', 10, 3600)   // 16.12: a visitor is counted by address, so a few a hour
  async uploadSuggestionImage(@Body() body: UploadSuggestionImageDto, @CurrentUser() user: any) {
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

  /** Legacy Cloudinary route is deliberately disabled for regulated provider documents. */
  @Post('upload-cloudinary')
  uploadCloudinary() {
    throw new ServiceUnavailableException('cloudinary_upload_disabled_use_private_object_storage');
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'StorageObject', schema: StorageObjectSchema }])],
  controllers: [StorageController],
  providers: [StorageService, UploadSecurityService, ClamavService, PendingScanService],
  exports: [StorageService, UploadSecurityService, ClamavService, PendingScanService, MongooseModule],
})
export class StorageModule {}
