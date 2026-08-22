import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({ required: true })
  actorRole: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  payloadHash: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
