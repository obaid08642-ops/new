import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class EncounterReferral {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true, index: true })
  appointment_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  patient_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctor_id: Types.ObjectId;

  @Prop({ type: [String], default: [] }) // Stores array of required Lab Test item short codes
  requested_lab_tests: string[];

  @Prop({ type: [String], default: [] }) // Stores array of required Radiology Scan codes
  requested_radiology_scans: string[];

  @Prop({ type: String, default: null }) // Home care recommendations and nursing requirements description
  home_care_recommendation_notes: string;

  @Prop({ type: Boolean, default: false, index: true })
  diagnostic_results_returned: boolean; // Flag auto-tripped when Lab/Radiology upload reports

  @Prop({ type: [String], default: [] }) // S3 URLs of the newly arrived diagnostic reports
  returned_results_file_urls: string[];

  @Prop({ type: String, enum: ['public_radius_broadcast', 'hospital_internal_dispatch'], default: 'public_radius_broadcast' })
  prescription_routing_status: string;
}
export const EncounterReferralSchema = SchemaFactory.createForClass(EncounterReferral);
