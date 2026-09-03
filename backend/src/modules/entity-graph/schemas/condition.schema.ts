import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConditionDocument = Condition & Document;

@Schema({ collection: 'conditions', timestamps: true })
export class Condition {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true, index: true })
  name_ar: string;

  @Prop({ required: true, index: true })
  name_en: string;

  @Prop({ type: [String], default: [], index: true })
  symptoms: string[];

  @Prop({ type: [String], default: [], index: true })
  specialties: string[];

  @Prop({ type: [String], default: [] })
  relevant_services: string[];

  @Prop({ type: [String], default: [], index: true })
  relevant_ingredients: string[];

  @Prop({ type: String, default: '' })
  overview_ar: string;

  @Prop({ type: String, default: '' })
  overview_en: string;

  @Prop({ type: Boolean, default: true, index: true })
  is_active: boolean;
}

export const ConditionSchema = SchemaFactory.createForClass(Condition);
ConditionSchema.index({ name_ar: 'text', name_en: 'text', symptoms: 'text' });
