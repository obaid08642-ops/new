import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type FraudAlertDocument = FraudAlert & Document;

@Schema({ timestamps: true, collection: 'fraud_alerts' })
export class FraudAlert {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  providerId: string;

  @Prop({ required: true, enum: ['duplicate_reviews_same_ip', 'rapid_bookings'], index: true })
  flagType: 'duplicate_reviews_same_ip' | 'rapid_bookings';

  @Prop({ required: true })
  confidenceScore: number;

  @Prop({ required: true, enum: ['pending', 'flagged', 'dismissed'], default: 'pending', index: true })
  status: 'pending' | 'flagged' | 'dismissed';
}

export const FraudAlertSchema = SchemaFactory.createForClass(FraudAlert);
