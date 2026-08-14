import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProviderType, ProviderStatus } from '../common/enums';
import { v4 as uuid } from 'uuid';
import { InsuranceNetworkContract, InsuranceNetworkContractSchema } from './insurance.schema';
import { buildSlug } from '../common/slug.util';

@Schema({ timestamps: true, collection: 'provider_profiles' })
export class ProviderProfile {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ unique: true, sparse: true, index: true }) slug?: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ unique: true, sparse: true, index: true }) account_id?: string;
  @Prop({ type: String, enum: Object.values(ProviderType), required: true }) type: ProviderType;
  @Prop({ type: String, enum: Object.values(ProviderStatus), default: ProviderStatus.PENDING })
  status: ProviderStatus;
  // Common
  @Prop() name_ar: string;
  @Prop() name_en?: string;
  @Prop() license_number?: string; // general commercial/clinical license
  @Prop() scfhs_license_number?: string; // Saudi Commission for Health Specialties license
  @Prop() cr_number?: string; // Commercial Registration
  @Prop() moh_license_number?: string; // Ministry of Health license
  @Prop() sfda_license_number?: string; // SFDA license (Pharmacies)
  @Prop() tax_number?: string; // VAT / Tax Number
  @Prop() license_expiry_date?: Date;
  @Prop({ type: String, enum: ['pending_documents', 'pending_verification', 'verified', 'rejected', 'suspended', 'expired'], default: 'pending_documents' })
  license_status: string;
  @Prop({ default: [] }) license_documents: string[]; // s3/r2 document urls
  @Prop({ default: false }) license_verified: boolean;
  @Prop({
    type: [{
      status: String,
      verified_by: String,
      verified_at: Date,
      notes: String,
    }],
    _id: false,
    default: []
  })
  verification_logs: Array<{ status: string; verified_by?: string; verified_at: Date; notes?: string }>;
  @Prop() city?: string;
  @Prop() district?: string;
  @Prop() address?: string;
  @Prop({ type: { lat: Number, lng: Number }, _id: false }) location?: { lat: number; lng: number };
  @Prop({ default: 0 }) rating: number;
  @Prop({ default: 0 }) reviews_count: number;
  @Prop() iban?: string;
  @Prop() bank_account_name?: string;
  // Doctor-specific
  @Prop() specialty?: string;
  @Prop({ default: [] }) sub_specialties: string[];
  @Prop() title?: string; // Dr., Prof., etc
  @Prop() years_experience?: number;
  @Prop({ default: [] }) consultation_modes: string[]; // clinic|online|home
  @Prop() price_clinic?: number;
  @Prop() price_online?: number;
  @Prop() price_home?: number;
  @Prop() hospital?: string;
  @Prop() facility_id?: string; // → Facility.id
  
  // Lab / Radiology specific
  @Prop() radiation_safety_license?: string;
  @Prop() available_equipment_text?: string;
  @Prop({ default: [] }) clinic_images: string[]; // Array of clinic/office photos
  @Prop({ type: String, enum: ['professor', 'consultant', 'senior_specialist', 'specialist', 'resident', 'general_practitioner'] })
  academic_degree?: string;
  @Prop() bio?: string;
  @Prop({ default: [] }) languages: string[];
  @Prop({ default: [] }) accepted_insurance: string[];
  @Prop({ default: false }) accepts_insurance: boolean;
  @Prop({ default: false }) insurance_clinic: boolean;
  @Prop({ default: false }) insurance_online: boolean;
  @Prop({ default: false }) insurance_home: boolean;
  @Prop({ type: [InsuranceNetworkContractSchema], default: [] })
  insurance_contracts: InsuranceNetworkContract[];
  @Prop({ default: false }) has_insurance_officer: boolean;
  // Pharmacy-specific
  @Prop() pharmacy_chain?: string;
  @Prop({ default: false }) has_own_drivers: boolean;
  @Prop() delivery_radius_km?: number;
  @Prop({ default: false }) has_own_delivery: boolean;
  @Prop({ type: String, enum: ['self_delivery', 'external_delivery_required'], default: 'external_delivery_required' })
  delivery_mode: string;
  @Prop({ default: 10 }) max_delivery_radius_km: number;
  @Prop() estimated_delivery_time?: string;
  @Prop() delivery_fee?: number;
  @Prop() free_delivery_above?: number;
  @Prop() min_order_sar?: number;
  @Prop({ default: false }) express_delivery: boolean;
  @Prop() express_fee?: number;
  @Prop() express_minutes?: number;
  @Prop({ default: false }) rx_dispensing: boolean;
  @Prop({ default: false }) otc_selling: boolean;
  @Prop({ default: [] }) enabled_categories: string[];
  // Nursing-specific
  @Prop({ type: String, enum: ['male', 'female', 'any'] })
  gender?: string;
  @Prop()
  nationality?: string;
  @Prop({ default: [] })
  pricingModel?: string[];
  @Prop() priceVisit?: number;
  @Prop() priceHour?: number;
  @Prop() priceDay?: number;
  @Prop() priceMonth?: number;
  @Prop({ type: Object })
  rating_details?: {
    quality: number;
    punctuality: number;
    communication: number;
  };

  // Lab/Radiology
  @Prop({ default: [] }) test_categories: string[];
  // ===== UNIFIED CAPABILITIES (cross-type) =====
  @Prop({ default: 10 }) coverage_radius_km: number;
  @Prop({ default: false }) home_visit_supported: boolean;
  @Prop() home_visit_radius_km?: number;
  @Prop({ default: false }) accepts_cash: boolean;
  /** Hospitals/clinics: roster of doctors (lightweight pointer). */
  @Prop({
    type: [{ 
      doctor_user_id: String, 
      name: String, 
      email: String,
      specialty: String, 
      modes: [String], 
      price_clinic: Number, 
      price_online: Number, 
      price_home: Number,
      insurance_clinic: { type: Boolean, default: false },
      insurance_online: { type: Boolean, default: false },
      insurance_home: { type: Boolean, default: false },
      clinic_images: [String],
      working_hours: [{ day: String, open: String, close: String, open_evening: String, close_evening: String, closed: { type: Boolean, default: false } }]
    }],
    _id: false, default: [],
  })
  doctors_roster: Array<{ 
    doctor_user_id?: string; 
    name: string; 
    email?: string;
    specialty: string; 
    modes: string[]; 
    price_clinic?: number; 
    price_online?: number; 
    price_home?: number;
    insurance_clinic?: boolean;
    insurance_online?: boolean;
    insurance_home?: boolean;
    clinic_images?: string[];
    working_hours?: { day: string; open: string; close: string; open_evening?: string; close_evening?: string; closed?: boolean }[];
  }>;

  @Prop({ type: [Object], _id: false, default: [] })
  lab_roster: any[];

  @Prop({ type: [Object], _id: false, default: [] })
  radiology_roster: any[];

  @Prop({ type: [Object], _id: false, default: [] })
  nursing_roster: any[];

  /** Nursing/home-care services list. */
  @Prop({
    type: [{ key: String, name_ar: String, name_en: String, price: Number, requires_prescription: { type: Boolean, default: false } }],
    _id: false, default: [],
  })
  nursing_services: Array<{ key: string; name_ar: string; name_en?: string; price: number; requires_prescription?: boolean }>;
  /** Radiology equipment / modalities offered. */
  @Prop({ default: [] }) equipment_list: string[];
  /** Lab gender preference for technicians (e.g., for women's clinic). */
  @Prop({ type: String, enum: ['any', 'male_only', 'female_only'], default: 'any' }) gender_pref: string;
  /** Onboarding state tracking. */
  @Prop({ default: 0 }) onboarding_step: number;
  @Prop({ default: false }) onboarding_completed: boolean;
  @Prop() signer_name?: string;
  @Prop() signer_role?: string;
  @Prop() signature_url?: string;
  // Working hours
  @Prop({
    type: [{ day: String, open: String, close: String, open_evening: String, close_evening: String, closed: { type: Boolean, default: false } }],
    _id: false,
    default: [],
  })
  working_hours: { day: string; open: string; close: string; open_evening?: string; close_evening?: string; closed?: boolean }[];
  @Prop({ default: 10 }) commission_rate?: number;
  // Meta
  @Prop() rejected_reason?: string;
  @Prop() approved_at?: Date;
  @Prop() approved_by?: string;
}
export type ProviderProfileDocument = ProviderProfile & Document;
export const ProviderProfileSchema = SchemaFactory.createForClass(ProviderProfile);

ProviderProfileSchema.pre('save', function (next) {
  if (this.isModified('name_ar') || this.isModified('name_en') || !this.slug) {
    const name = this.name_ar || this.name_en || 'provider';
    this.slug = buildSlug(name, this.id);
  }
  next();
});
