import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HeatmapDataDocument = HeatmapData & Document;

@Schema({ timestamps: true })
export class HeatmapData {
  @Prop({ required: true })
  clusterId: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ required: true })
  intensity: number; // Density mapping weight

  @Prop({ type: String, enum: ['home_care', 'diabetes_program', 'pharmacy_drop'], required: true })
  type: string;
}

export const HeatmapDataSchema = SchemaFactory.createForClass(HeatmapData);
