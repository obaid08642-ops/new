import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DoctorProfileExtendedDocument = DoctorProfileExtended & Document;

@Schema({ timestamps: true })
export class DoctorProfileExtended {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  doctor_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  parent_provider_account_id: Types.ObjectId | null; // Indicates Institutional Framework (Hospital/Clinic Group)

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  affiliated_hospital_id: Types.ObjectId | null;

  @Prop({ required: true, default: 0 })
  price_clinic: number;

  @Prop({ required: true, default: 0 })
  price_online: number;

  @Prop({ required: true, default: 0 })
  price_home: number;

  @Prop({ required: true, default: 10 })
  max_home_visit_radius_km: number;

  @Prop({ type: [String], default: [] })
  accepted_insurance_networks: string[];

  @Prop({ type: [String], default: [] })
  clinic_gallery_images: string[];

  @Prop({ type: Object, default: {} })
  weekly_schedule_template: Record<string, any>; // Complex JSON grid mapping day slots
}
export const DoctorProfileExtendedSchema = SchemaFactory.createForClass(DoctorProfileExtended);
