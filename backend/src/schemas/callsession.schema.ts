import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class CallSession {
  @Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) appointment_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) provider_id: string;
  @Prop() room_name?: string;
  @Prop({ default: 'video' }) call_type: string; // video | audio | chat
  @Prop({ default: 'INITIATED', index: true }) status: string; // INITIATED | ACTIVE | ENDED | FAILED
  @Prop() started_at?: Date;
  @Prop() ended_at?: Date;
  @Prop() duration_seconds?: number;
  @Prop() end_reason?: string;
}
export type CallSessionDocument = CallSession & Omit<Document, 'id'>;
export const CallSessionSchema = SchemaFactory.createForClass(CallSession);
