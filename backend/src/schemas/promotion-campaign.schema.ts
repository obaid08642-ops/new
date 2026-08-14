import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'promotion_campaigns' })
export class PromotionCampaign extends Document {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  provider_id: string;

  @Prop({ required: true })
  title_ar: string;

  @Prop({ required: true })
  title_en: string;

  @Prop({ required: true })
  original_price: number;

  @Prop({ required: true })
  discounted_price: number;

  @Prop({ required: true })
  start_date: Date;

  @Prop({ required: true })
  end_date: Date;

  @Prop()
  image_url?: string;

  @Prop({ default: 'pending', enum: ['draft', 'pending', 'active', 'paused', 'completed'] })
  status: string;

  @Prop({ type: Object, default: {} })
  target_parameters?: any;
}
export type PromotionCampaignDocument = PromotionCampaign & Document;
export const PromotionCampaignSchema = SchemaFactory.createForClass(PromotionCampaign);
