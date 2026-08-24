import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'patient_profiles' })
export class PatientProfile {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop() age?: number;
  @Prop({ enum: ['male', 'female'] }) gender?: string;
  @Prop() blood_type?: string;
  @Prop() weight?: number;
  @Prop() height?: number;
  @Prop({ default: [] }) allergies: string[];
  @Prop({ default: [] }) chronic_diseases: string[];
  @Prop({ default: [] }) current_medications: string[];
  @Prop({ type: [{ id: String, name: String, phone: String, relation: String, isPrimary: Boolean }], _id: false, default: [] })
  emergency_contacts: { id?: string; name: string; phone: string; relation: string; isPrimary?: boolean }[];
  @Prop() full_name?: string;
  @Prop() phone?: string;
  @Prop() email?: string;
  @Prop() dob?: string;
  @Prop() national_id?: string;
  @Prop({ type: Object }) notification_settings?: Record<string, any>;
  @Prop({ type: Object }) privacy_settings?: Record<string, any>;
  @Prop({ type: Object }) security_settings?: Record<string, any>;
  
  @Prop({
    type: [{
      id: String,
      label: String,
      street: String,
      address: String,
      city: String,
      district: String,
      building: String,
      floor: String,
      notes: String,
      lat: Number,
      lng: Number,
      is_default: Boolean,
    }],
    _id: false,
    default: [],
  })
  addresses: {
    id: string;
    label: string;
    street: string;
    address?: string;
    city: string;
    district?: string;
    building?: string;
    floor?: string;
    notes?: string;
    lat?: number;
    lng?: number;
    is_default?: boolean;
  }[];
  @Prop({
    type: {
      provider: String,
      policy_number: String,
      network: String,
      class: String,
      expiry_date: String,
      member_name: String,
      national_id: String,
      verified: Boolean,
      pdf_url: String,
      ocr_extracted: Boolean,
      nphies_eligible: Boolean,
    },
    _id: false,
  })
  insurance?: {
    provider: string;
    policy_number: string;
    network: string;
    class?: string;
    expiry_date?: string;
    member_name?: string;
    national_id?: string;
    verified?: boolean;
    pdf_url?: string;
    ocr_extracted?: boolean;
    nphies_eligible?: boolean;
  };
}
export type PatientProfileDocument = PatientProfile & Document;
export const PatientProfileSchema = SchemaFactory.createForClass(PatientProfile);
