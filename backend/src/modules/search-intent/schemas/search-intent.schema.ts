import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SearchIntentDocument = SearchIntent & Document;

export type IntentType = 'discovery' | 'booking' | 'order' | 'info' | 'availability';
export type EntityType =
  | 'doctor'
  | 'medicine'
  | 'pharmacy'
  | 'hospital'
  | 'clinic'
  | 'lab'
  | 'radiology'
  | 'nursing'
  | 'service'
  | 'condition'
  | 'specialty';

export type ServiceMode = 'clinic' | 'home' | 'video' | 'voice' | 'delivery' | 'pickup';

@Schema({ collection: 'search_intents', timestamps: true })
export class SearchIntent {
  @Prop({ required: true, index: true })
  query_pattern: string;

  @Prop({ required: true, default: 'any', index: true })
  lang: string;

  @Prop({
    required: true,
    enum: ['discovery', 'booking', 'order', 'info', 'availability'],
    index: true,
  })
  intent_type: IntentType;

  @Prop({
    required: true,
    enum: [
      'doctor',
      'medicine',
      'pharmacy',
      'hospital',
      'clinic',
      'lab',
      'radiology',
      'nursing',
      'service',
      'condition',
      'specialty',
    ],
    index: true,
  })
  entity_type: EntityType;

  @Prop({ type: String, required: false, index: true })
  specialty?: string;

  @Prop({ type: String, required: false, index: true })
  service?: string;

  @Prop({ type: String, required: false, index: true })
  insurance?: string;

  @Prop({
    type: String,
    enum: ['clinic', 'home', 'video', 'voice', 'delivery', 'pickup'],
    required: false,
  })
  service_mode?: ServiceMode;

  @Prop({ type: String, required: false })
  canonical_path?: string;

  @Prop({ type: Number, default: 1 })
  weight: number;

  @Prop({ type: Boolean, default: true, index: true })
  is_active: boolean;
}

export const SearchIntentSchema = SchemaFactory.createForClass(SearchIntent);
SearchIntentSchema.index({ query_pattern: 'text' });
