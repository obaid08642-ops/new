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
  @Prop({ required: true, enum: MEDIA_PURPOSES, index: true }) purpose: MediaPurpose;
  @Prop({ index: true }) thread_id?: string;
  @Prop() original_name?: string;
  @Prop() mime_type?: string;
  @Prop() size_bytes?: number;
}

export type MediaAssetDocument = MediaAsset & Document;
export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
MediaAssetSchema.index({ owner_id: 1, purpose: 1, createdAt: -1 });
MediaAssetSchema.index({ thread_id: 1, purpose: 1, createdAt: -1 });
