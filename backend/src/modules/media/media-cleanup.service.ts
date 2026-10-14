import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { MediaService } from './media.service';
import { MediaAsset, MediaAssetDocument } from './media.schema';

/** Event any module emits when a `media:<id>` file stops being used (D-32). */
export const MEDIA_RELEASE = 'media.release';
export interface MediaReleaseEvent { ids?: string[]; keys?: string[]; owner_id?: string }

/**
 * D-32 (owner decision 32): replacing or deleting a file removes the old object from storage. A released media file
 * loses its R2 object and its `media_assets` row; with `owner_id` only that owner's files are touched.
 */
@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger('MediaCleanupService');

  constructor(
    private readonly media: MediaService,
    @InjectModel(MediaAsset.name) private readonly assets: Model<MediaAssetDocument>,
  ) {}

  @OnEvent(MEDIA_RELEASE, { async: true })
  async onRelease(event: MediaReleaseEvent) {
    try { await this.release(event); } catch (e: any) { this.logger.warn(`media.release failed: ${e?.message}`); }
  }

  /** Deletes the objects and rows of the given ids or keys; returns how many were removed. */
  async release(event: MediaReleaseEvent): Promise<number> {
    const ids = (event?.ids || []).filter((v) => typeof v === 'string' && v).map(String);
    const keys = (event?.keys || []).filter((v) => typeof v === 'string' && v).map(String);
    if (!ids.length && !keys.length) return 0;
    const or: any[] = [];
    if (ids.length) or.push({ id: { $in: ids } });
    if (keys.length) or.push({ key: { $in: keys } });
    const query: any = { $or: or };
    if (event.owner_id) query.owner_id = { $eq: String(event.owner_id) };
    const rows: any[] = await this.assets.find(query).lean();
    let removed = 0;
    for (const row of rows) {
      try {
        await this.media.deleteFile(row.key);
      } catch (e: any) {
        this.logger.warn(`media object ${row.key} not deleted: ${e?.message}`);
        continue;
      }
      await this.assets.deleteOne({ id: { $eq: row.id } });
      removed += 1;
    }
    return removed;
  }
}

/** The media id of a `media:<id>` reference, or null. */
export function mediaRefId(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('media:') && value.length > 6 ? value.slice(6) : null;
}
