import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type AdPlacementDocument = AdPlacement & Document;

@Schema({ timestamps: true, collection: 'ad_placements' })
export class AdPlacement {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  providerId: string;

  @Prop({ required: true })
  bidAmount: number;

  @Prop({ required: true })
  dailyBudget: number;

  @Prop({ type: [String], default: [] })
  targetedKeywords: string[];

  @Prop({ required: true, enum: ['active', 'paused'], default: 'active', index: true })
  status: 'active' | 'paused';

  @Prop({ default: 0 })
  impressionsCount: number;

  @Prop({ default: 0 })
  clicksCount: number;
}

export const AdPlacementSchema = SchemaFactory.createForClass(AdPlacement);
