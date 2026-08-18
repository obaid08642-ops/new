import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'image_processing_jobs' })
export class ImageProcessingJob extends Document {
  @Prop({ required: true, index: true }) owner_id: string;
  @Prop({ required: true, enum: ['doctor', 'nurse'] }) owner_type: string;
  @Prop({ required: true }) data_base64: string;
  @Prop({ required: true }) mime: string;
  @Prop({ required: true }) original_name: string;
  @Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true })
  status: string;
  @Prop({ default: 0 }) attempts: number;
  @Prop() error?: string;
  @Prop() processedAt?: Date;
}
export type ImageProcessingJobDocument = ImageProcessingJob & Document;
export const ImageProcessingJobSchema = SchemaFactory.createForClass(ImageProcessingJob);
