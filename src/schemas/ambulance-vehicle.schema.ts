import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

/**
 * A single ambulance vehicle/unit in a provider's fleet.
 * Owner is either an INDEPENDENT ambulance company (provider type = ambulance)
 * or a HOSPITAL/CLINIC operating its own fleet (dual model).
 * Every vehicle is reviewed by admin before it can be marked available.
 */
@Schema({ timestamps: true, collection: 'ambulance_vehicles' })
export class AmbulanceVehicle {
  @Prop({ default: () => uuid(), unique: true }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) plate_number: string;
  @Prop() model?: string;
  @Prop() year?: number;
  @Prop({ type: [String], default: [] }) equipment: string[];
  @Prop({ default: 1 }) paramedic_count: number;
  @Prop({ default: false }) has_icu: boolean;
  /** Unit capability class used by the dispatch engine (BLS basic, ALS advanced, ICU mobile intensive care) */
  @Prop({ type: String, enum: ['BLS', 'ALS', 'ICU'], default: 'BLS', index: true }) vehicle_type: string;
  /** Last known unit position (pushed by the crew app) — feeds nearest/ETA scoring */
  @Prop({ type: { lat: Number, lng: Number, updated_at: Date }, _id: false })
  last_location?: { lat?: number; lng?: number; updated_at?: Date };
  @Prop() base_city?: string;
  /** Document URLs (vehicle license, registration/istimara, insurance) uploaded via /storage */
  @Prop({ type: [String], default: [] }) documents: string[];
  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true })
  status: string;
  @Prop() admin_notes?: string;
  @Prop() reviewed_by?: string;
  @Prop() reviewed_at?: Date;
  @Prop({ default: true }) is_available: boolean;
}
export type AmbulanceVehicleDocument = AmbulanceVehicle & Document;
export const AmbulanceVehicleSchema = SchemaFactory.createForClass(AmbulanceVehicle);
