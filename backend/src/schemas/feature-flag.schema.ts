import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type FeatureFlagDocument = FeatureFlag & Document;

@Schema({ timestamps: true, collection: 'feature_flags' })
export class FeatureFlag {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, unique: true, index: true })
  flagName: string;

  @Prop({ required: true, default: false })
  isEnabled: boolean;

  @Prop()
  updatedBy?: string;
}

export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
