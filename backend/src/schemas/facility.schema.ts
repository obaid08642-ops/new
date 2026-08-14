import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { FacilityType } from '../common/enums';
import { InsuranceNetworkContract, InsuranceNetworkContractSchema } from './insurance.schema';

/**
 * Facility = Hospital / Clinic / Medical Center / Polyclinic.
 * Doctors reference Facility via ProviderProfile.facility_id (string FK).
 */
@Schema({ timestamps: true, collection: 'facilities' })
export class Facility {
  @Prop({ default: () => uuid() }) id: string;
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

  // Stats
  @Prop({ default: 0 }) rating: number;
  @Prop({ default: 0 }) reviews_count: number;
  @Prop({ default: true }) is_active: boolean;
}
export type FacilityDocument = Facility & Document;
export const FacilitySchema = SchemaFactory.createForClass(Facility);
