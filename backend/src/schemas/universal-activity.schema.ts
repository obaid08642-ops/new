import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type UniversalActivityDocument = UniversalActivity & Document;

@Schema({ timestamps: true, collection: 'universal_activities' })
export class UniversalActivity {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  providerId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: () => new Date(), index: true })
  timestamp: Date;
}

export const UniversalActivitySchema = SchemaFactory.createForClass(UniversalActivity);
UniversalActivitySchema.index({ eventType: 1, timestamp: -1 });
