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
  /** INTERNAL ONLY: owning provider account (hospital fleet vs independent) — never exposed to patients (S1) */
  @Prop() assigned_provider_id?: string;
  /** Patient-safe unit label (plate number) shown instead of internal ids */
  @Prop() unit_label?: string;
  /** Patient-safe paramedic/driver display name once known */
  @Prop() paramedic_name?: string;
  @Prop() claimed_at?: Date;
  @Prop({ type: { lat: Number, lng: Number, updated_at: Date }, _id: false })
  unit_location?: { lat?: number; lng?: number; updated_at?: Date };
  @Prop() admin_notes?: string;
  @Prop() resolved_at?: Date;
  @Prop() resolved_by?: string;
  @Prop({ type: [{ from: String, to: String, by: String, at: Date }], _id: false, default: [] })
  state_history: { from: string; to: string; by: string; at: Date }[];
}
export type EmergencyRequestDocument = EmergencyRequest & Document;
export const EmergencyRequestSchema = SchemaFactory.createForClass(EmergencyRequest);
