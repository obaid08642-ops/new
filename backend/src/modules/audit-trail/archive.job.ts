import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

export const ARCHIVE_MANIFEST_STATUS = {
  PENDING: 'pending_sync',
  SYNCED: 'synced',
} as const;

@Injectable()
export class ArchiveJob {
  private readonly logger = new Logger('AuditArchive');

  constructor(@InjectConnection() private readonly connection: Connection) {}

  buildManifestId(day: string): string {
    return `archive-${day}`;
  }

  @Cron('0 2 * * *')
  async runDaily(): Promise<{ manifestId: string; status: string; count: number }> {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const day = dayStart.toISOString().slice(0, 10);
    return this.archiveDay(day, dayStart, dayEnd);
  }

  async archiveDay(day: string, dayStart: Date, dayEnd: Date): Promise<{ manifestId: string; status: string; count: number }> {
    const events = this.connection.collection('audit_events');
    const manifests = this.connection.collection('audit_archive_manifests');
    const rows = await events
      .find({ at: { $gte: dayStart, $lt: dayEnd } } as any, { projection: { hash: 1, prev_hash: 1 } } as any)
      .sort({ _id: 1 })
      .toArray()
      .catch(() => []);
    const manifest = {
      id: this.buildManifestId(day),
      day,
      count: rows.length,
      head_hash: rows.length ? (rows[0] as any).hash : null,
      tail_hash: rows.length ? (rows[rows.length - 1] as any).hash : null,
      status: 'pending_sync',
      upload_receipt: null as any,
      created_at: new Date(),
    };
    await manifests.updateOne(
      { id: manifest.id } as any,
      { $set: manifest } as any,
      { upsert: true } as any,
    ).catch((err: any) => this.logger.error(`archive manifest write failed: ${err?.message || err}`));

    if (process.env.AUDIT_ARCHIVE_BUCKET) {
      await this.uploadManifest(manifest);
    } else {
      this.logger.warn(`audit archive ${day}: no AUDIT_ARCHIVE_BUCKET configured -- manifest left pending_sync (BLOCKED: object-lock upload)`);
    }
    return { manifestId: manifest.id, status: manifest.status, count: manifest.count };
  }

  async uploadManifest(manifest: { id: string }): Promise<void> {
    const bucket = process.env.AUDIT_ARCHIVE_BUCKET;
    if (!bucket) {
      throw new Error('BLOCKED: AUDIT_ARCHIVE_BUCKET not configured -- object-lock upload unavailable (no credentials in this environment)');
    }
    throw new Error('BLOCKED: object-lock upload provider not wired -- manifest stays pending_sync until deploy phase provides storage credentials');
  }
}
