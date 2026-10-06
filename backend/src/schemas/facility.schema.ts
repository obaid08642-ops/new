import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { FacilityType } from '../common/enums';
import { InsuranceNetworkContract, InsuranceNetworkContractSchema } from './insurance.schema';

/** Supported locale keys (tl = Filipino/Tagalog). */
export const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Facility = Hospital / Clinic / Medical Center / Polyclinic.
 * Doctors reference Facility via ProviderProfile.facility_id (string FK).
 */
@Schema({ timestamps: true, collection: 'facilities' })
export class Facility {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ unique: true, sparse: true, index: true }) slug?: string;
  @Prop({ index: true }) parent_facility_id?: string; // Multi-tenant parent hospital/clinic mapping
  @Prop({ required: true }) name_ar: string;
  @Prop() name_en?: string;
  @Prop({ type: String, enum: Object.values(FacilityType), default: FacilityType.HOSPITAL })
  type: FacilityType;
  @Prop() description_ar?: string;
  @Prop() description_en?: string;

  // Location
  @Prop() city?: string;
  @Prop() district?: string;
  @Prop() address?: string;
  @Prop({ type: { lat: Number, lng: Number }, _id: false })
  location?: { lat: number; lng: number };

  // Media
  @Prop() logo_url?: string;
  @Prop({ default: [] }) images: string[];

  // Contacts
  @Prop() phone?: string;
  @Prop() whatsapp?: string;
  @Prop() website?: string;
  @Prop() email?: string;

  // Capabilities
  @Prop({ default: [] }) departments: string[]; // specialty slugs supported
  @Prop({ default: [] }) accepted_insurance: string[];
  @Prop({ default: false }) accepts_insurance: boolean;
  @Prop({ type: [InsuranceNetworkContractSchema], default: [] })
  insurance_contracts: InsuranceNetworkContract[];

  // Working hours (same shape as ProviderProfile.working_hours)
  @Prop({ type: [{ day: String, open: String, close: String, closed: { type: Boolean, default: false } }], _id: false, default: [] })
  working_hours: { day: string; open: string; close: string; closed?: boolean }[];

  // Stats (real reviews only — never seeded)
  // F16: reference (directory listing) vs verified (reviewed) facility.
  @Prop({ type: String, enum: ['reference', 'verified', 'operational'], default: 'operational', index: true })
  status: string;
  @Prop({ default: true }) is_active: boolean;
  // Operational activity never implies public discovery or search indexing.
  @Prop({ default: false, index: true }) public_eligibility: boolean;
  @Prop({ default: false, index: true }) indexing_eligibility: boolean;
  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true })
  medical_review_status: string;
  @Prop() last_reviewed?: Date;
  @Prop() provenance?: string;

  /** Per-locale translations for 6 languages (ar, en, ur, hi, bn, tl). */
  @Prop({ type: Object, default: {} }) translations: Record<string, Record<string, unknown>>;
}
export type FacilityDocument = Facility & Document;
export const FacilitySchema = SchemaFactory.createForClass(Facility);

// Per-locale public URL slugs — every locale resolves its own slug without
// mixing languages. Sparse so pre-v14 documents (no localized slugs) are exempt.
for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
  FacilitySchema.index({ [`translations.${lang}.slug`]: 1 }, { unique: true, sparse: true });
}
