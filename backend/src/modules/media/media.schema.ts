import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export const MEDIA_PURPOSES = ['order_prescription', 'chat', 'avatar', 'report'] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

@Schema({ timestamps: true, collection: 'media_assets' })
export class MediaAsset {
  @Prop({ default: () => uuid(), unique: true, index: true }) id: string;
  @Prop({ required: true, unique: true, index: true }) key: string;
  @Prop({ required: true, index: true }) owner_id: string;
  @Prop({ required: true, enum: MEDIA_PURPOSES, index: true, type: String }) purpose: MediaPurpose;
  @Prop({ index: true }) thread_id?: string;
  @Prop() original_name?: string;
  @Prop() mime_type?: string;
  @Prop() size_bytes?: number;
  /** UPLOAD_SCAN=defer: 'pending_scan' | 'scanning' until the worker has passed the file (its key sits under `pending/`); absent on rows scanned before they were stored. */
  @Prop({ type: String, enum: ['pending_scan', 'scanning', 'clean', 'infected'] }) scan_status?: string;
  @Prop() scan_claimed_at?: Date;
  @Prop() scanned_at?: Date;
  @Prop({ default: undefined }) scan_attempts?: number;
}

export type MediaAssetDocument = MediaAsset & Document;
export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
MediaAssetSchema.index({ owner_id: 1, purpose: 1, createdAt: -1 });
MediaAssetSchema.index({ thread_id: 1, purpose: 1, createdAt: -1 });
// the scan worker's queue: unscanned files, oldest first (sparse: the rows scanned before they were stored never enter it)
MediaAssetSchema.index({ scan_status: 1, createdAt: 1 }, { sparse: true, name: 'scan_queue' });
