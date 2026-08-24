import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FraudAlertDocument = FraudAlert & Document;

@Schema({ timestamps: true })
export class FraudAlert {
  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true })
  entityName: string;

  @Prop({ type: String, enum: ['doctor', 'pharmacy', 'home_care', 'patient'], required: true })
  type: string;

  @Prop({ required: true })
  flagReason: string;

  @Prop({ type: String, enum: ['high', 'medium', 'low'], required: true })
  severity: string;
}

export const FraudAlertSchema = SchemaFactory.createForClass(FraudAlert);
