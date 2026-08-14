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
  @Prop({ type: [{ name: String, phone: String, relation: String }], _id: false, default: [] })
  emergency_contacts: { name: string; phone: string; relation: string }[];
  
  @Prop({
    type: [{
      id: String,
      label: String,
      street: String,
      city: String,
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
    city: string;
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
