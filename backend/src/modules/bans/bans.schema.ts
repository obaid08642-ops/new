import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as crypto from 'crypto';

export type BanDocument = Ban & Document;

@Schema({ timestamps: true })
export class Ban {
  @Prop({ default: () => crypto.randomUUID(), unique: true })
  id: string;

  @Prop({ required: true, enum: ['ip', 'device'] })
  type: string;

  @Prop({ required: true })
  value: string; // The IP address or the Device ID

  @Prop()
  reason: string;

  @Prop({ required: true })
  banned_by_admin_id: string;

  @Prop()
  expires_at: Date;

  @Prop({ default: true })
  is_active: boolean;
}

export const BanSchema = SchemaFactory.createForClass(Ban);
