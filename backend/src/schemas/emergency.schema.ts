import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EmergencyState } from '../common/enums';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'emergency_requests' })
export class EmergencyRequest {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ type: { lat: Number, lng: Number, address: String }, _id: false })
  location?: { lat?: number; lng?: number; address?: string };
  @Prop() symptoms?: string;
  @Prop({ default: 'critical' }) severity: string;
  @Prop({ type: String, enum: Object.values(EmergencyState), default: EmergencyState.TRIGGERED, index: true })
  state: EmergencyState;
  @Prop() assigned_hospital_id?: string;
  @Prop() assigned_ambulance_id?: string;
  @Prop() admin_notes?: string;
  @Prop() resolved_at?: Date;
  @Prop() resolved_by?: string;
  @Prop({ type: [{ from: String, to: String, by: String, at: Date }], _id: false, default: [] })
  state_history: { from: string; to: string; by: string; at: Date }[];
}
export type EmergencyRequestDocument = EmergencyRequest & Document;
export const EmergencyRequestSchema = SchemaFactory.createForClass(EmergencyRequest);
