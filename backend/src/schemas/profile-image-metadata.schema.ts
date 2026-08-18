import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'profile_images_metadata' })
export class ProfileImageMetadata extends Document {
  @Prop({ required: true, index: true }) owner_id: string; // user_id or provider_profile_id
  @Prop({ required: true, enum: ['doctor', 'nurse'] }) owner_type: string;
  @Prop({ required: true }) originalImageUrl: string;
  @Prop() processedImageUrl?: string;
  @Prop() mediumImageUrl?: string;
  @Prop() thumbnailImageUrl?: string;
  @Prop({ default: false }) hasTransparentBackground: boolean;
  @Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' })
  processingStatus: string;
  @Prop({ required: true, default: 'disabled' }) processingProvider: string;
  @Prop() lastProcessedAt?: Date;
  @Prop() error?: string;
}
export type ProfileImageMetadataDocument = ProfileImageMetadata & Document;
export const ProfileImageMetadataSchema = SchemaFactory.createForClass(ProfileImageMetadata);
ProfileImageMetadataSchema.index({ owner_id: 1, processingStatus: 1 });
