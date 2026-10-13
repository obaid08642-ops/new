import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Canonical kill-switch store is `feature_flags` (with underscore) — the same
// collection ConfigService.getClientConfig() reads. A model default would
// pluralize to `featureflags` (no underscore), splitting writes from reads.
@Schema({ collection: 'feature_flags' })
export class FeatureFlag {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ default: false })
  enabled: boolean;
}

export type FeatureFlagDocument = FeatureFlag & Document;
export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
