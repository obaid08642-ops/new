import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class FeatureFlag {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ default: false })
  enabled: boolean;
}

export type FeatureFlagDocument = FeatureFlag & Document;
export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
