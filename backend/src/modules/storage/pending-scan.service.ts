import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { ClamavService } from './clamav.service';
import { PENDING_PREFIX, isPendingKey, promotedKey } from './pending-scan';

/** The bucket operations the worker needs (a test injects an in-memory one). */
export interface ObjectStore {
  get(key: string): Promise<Buffer>;
  copy(fromKey: string, toKey: string): Promise<void>;
  delete(key: string): Promise<void>;
}
export const PENDING_SCAN_STORE = 'PENDING_SCAN_STORE';

/** The same S3/R2 environment MediaService and the storage adapter read. */
export class S3ObjectStore implements ObjectStore {
  private client: any;
  private bucket = process.env.S3_BUCKET || process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
  private sdk() {
    if (!this.client) {
      const { S3Client } = require('@aws-sdk/client-s3');
      this.client = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || (process.env.CLOUDFLARE_R2_ACCOUNT_ID ? `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined),
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: true,
      });
    }
    return this.client;
  }
  async get(key: string): Promise<Buffer> {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const res = await this.sdk().send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const parts: Buffer[] = [];
    for await (const p of res.Body as AsyncIterable<Uint8Array>) parts.push(Buffer.from(p));
    return Buffer.concat(parts);
  }
  async copy(fromKey: string, toKey: string): Promise<void> {
    const { CopyObjectCommand } = require('@aws-sdk/client-s3');
    await this.sdk().send(new CopyObjectCommand({ Bucket: this.bucket, CopySource: `${this.bucket}/${encodeURIComponent(fromKey).replace(/%2F/g, '/')}`, Key: toKey }));
  }
  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await this.sdk().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

/** The two places a quarantined file can be recorded. */
const SOURCES = [
  { coll: 'storage_objects', keyField: 'external_key', infected: 'flag' },
  { coll: 'media_assets', keyField: 'key', infected: 'delete' },
] as const;

const STALE_CLAIM_MS = 10 * 60_000;
const WARN_AFTER_MS = 60 * 60_000;

export interface PendingScanResult { scanned: number; clean: number; infected: number; released: number; scanner_up: boolean }

/**
 * UPLOAD_SCAN=defer: scans the files that were accepted while the scanner was down, oldest first, and only then lets anyone open
 * them. A file under `pending/` is copied to its final key after ClamAV said OK (the row then points at the final key and loses its
 * pending status); an infected file is deleted. While the scanner does not answer nothing changes: the files stay unreadable.
 * Several instances may run it: a file is claimed with one atomic update, and a claim older than 10 minutes (a crashed worker) is taken over.
 */
@Injectable()
export class PendingScanService {
  private readonly logger = new Logger(PendingScanService.name);
  private running = false;
  private lastWarnAt = 0;
  private readonly store: ObjectStore;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly clamav: ClamavService,
    @Optional() @Inject(PENDING_SCAN_STORE) store?: ObjectStore,
  ) {
    this.store = store ?? new S3ObjectStore();
  }

  @Interval(60_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch (e: any) {
      this.logger.error(`pending scan run failed: ${e?.message || e}`);
    } finally {
      this.running = false;
    }
  }

  async runOnce(opts: { max?: number; budgetMs?: number } = {}): Promise<PendingScanResult> {
    const out: PendingScanResult = { scanned: 0, clean: 0, infected: 0, released: 0, scanner_up: false };
    const max = opts.max ?? 25;
    const deadline = Date.now() + (opts.budgetMs ?? 45_000);
    if (!(await this.clamav.scannerUp(2_000))) {
      await this.warnIfWaitingLong();
      return out;
    }
    out.scanner_up = true;
    while (out.scanned < max && Date.now() < deadline) {
      const claimed = await this.claimNext();
      if (!claimed) break;
      out.scanned += 1;
      const res = await this.scanOne(claimed.source, claimed.doc);
      out[res] += 1;
      if (res === 'released') break; // the scanner stopped answering: leave the rest where they are
    }
    if (out.scanned) this.logger.log(`pending scan: ${out.scanned} scanned, ${out.clean} clean, ${out.infected} infected, ${out.released} released`);
    return out;
  }

  private async claimNext(): Promise<{ source: (typeof SOURCES)[number]; doc: any } | null> {
    const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
    for (const source of SOURCES) {
      const col: any = this.conn.collection(source.coll);
      const r: any = await col.findOneAndUpdate(
        { $or: [{ scan_status: 'pending_scan' }, { scan_status: 'scanning', scan_claimed_at: { $lt: staleBefore } }] },
        { $set: { scan_status: 'scanning', scan_claimed_at: new Date() }, $inc: { scan_attempts: 1 } },
        { sort: { createdAt: 1 }, returnDocument: 'after' },
      );
      const doc = r && typeof r === 'object' && 'value' in r && !('_id' in r) ? r.value : r; // driver 5 wraps the document, 6 returns it
      if (doc) return { source, doc };
    }
    return null;
  }

  private async scanOne(source: (typeof SOURCES)[number], doc: any): Promise<'clean' | 'infected' | 'released'> {
    const col: any = this.conn.collection(source.coll);
    const key: string = doc[source.keyField];
    const release = async () => { await col.updateOne({ _id: doc._id, scan_status: 'scanning' }, { $set: { scan_status: 'pending_scan' } }); return 'released' as const; };
    if (!isPendingKey(key)) {
      // not in quarantine (a row of an older shape): nothing to move
      await col.updateOne({ _id: doc._id, scan_status: 'scanning' }, { $set: { scan_status: 'clean', scanned_at: new Date() } });
      return 'clean';
    }
    let bytes: Buffer;
    try {
      bytes = await this.store.get(key);
    } catch (e: any) {
      this.logger.error(`pending scan: cannot read ${key}: ${e?.message || e}`);
      return release();
    }
    const verdict = await this.clamav.scan(bytes);
    if (verdict.status === 'unavailable') return release();
    if (verdict.status === 'infected') {
      this.logger.warn(`pending scan: ${source.coll} ${doc.id} is infected (${verdict.signature}); deleted`);
      await this.store.delete(key).catch((e: any) => this.logger.error(`pending scan: infected object ${key} not deleted: ${e?.message}`));
      if (source.infected === 'delete') await col.deleteOne({ _id: doc._id });
      else await col.updateOne({ _id: doc._id }, { $set: { scan_status: 'infected', deleted: true, scanned_at: new Date() }, $unset: { data_base64: '' } });
      return 'infected';
    }
    const finalKey = promotedKey(key);
    try {
      await this.store.copy(key, finalKey);
    } catch (e: any) {
      this.logger.error(`pending scan: cannot move ${key}: ${e?.message || e}`);
      return release();
    }
    const url = typeof doc.external_url === 'string' && doc.external_url.endsWith(`/${key}`) ? `${doc.external_url.slice(0, -key.length)}${finalKey}` : doc.external_url;
    const done = await col.updateOne(
      { _id: doc._id, scan_status: 'scanning' },
      { $set: { [source.keyField]: finalKey, scan_status: 'clean', scanned_at: new Date(), ...(url ? { external_url: url } : {}) } },
    );
    // the row was removed while it was scanned (its owner deleted the file): the copy must not stay behind
    if (!done.matchedCount) await this.store.delete(finalKey).catch(() => null);
    await this.store.delete(key).catch((e: any) => this.logger.warn(`pending scan: ${key} not deleted after the move: ${e?.message}`));
    return 'clean';
  }

  /** The scanner is down: say so in the log once a file has waited over an hour (and at most every 10 minutes). */
  private async warnIfWaitingLong(): Promise<void> {
    const now = Date.now();
    if (now - this.lastWarnAt < 10 * 60_000) return;
    let oldest: Date | null = null;
    for (const source of SOURCES) {
      const row: any = await (this.conn.collection(source.coll) as any).findOne({ scan_status: { $in: ['pending_scan', 'scanning'] } }, { sort: { createdAt: 1 }, projection: { createdAt: 1 } });
      if (row?.createdAt && (!oldest || row.createdAt < oldest)) oldest = row.createdAt;
    }
    if (oldest && now - new Date(oldest).getTime() > WARN_AFTER_MS) {
      this.lastWarnAt = now;
      this.logger.warn(`pending scan: the virus scanner has not answered and the oldest upload has waited ${Math.round((now - new Date(oldest).getTime()) / 60_000)} min (${PENDING_PREFIX})`);
    }
  }
}
