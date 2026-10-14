import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// The collection is named explicitly: without it Mongoose pluralised the class to `featureflags`,
// while /config (ConfigService) and the kill-switch helper read `feature_flags`, so an admin
// toggle never reached the clients.
@Schema({ collection: 'feature_flags' })
export class FeatureFlag {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ default: false })
  enabled: boolean;
}

export type FeatureFlagDocument = FeatureFlag & Document;
export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
