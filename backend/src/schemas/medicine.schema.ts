import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { buildSlug } from '../common/slug.util';

@Schema({ timestamps: true, collection: 'medicines_master' })
export class Medicine {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ unique: true, sparse: true, index: true }) slug?: string;
  @Prop({ required: true, index: 'text' }) name_ar: string;
  @Prop({ index: 'text' }) name_en?: string;
  @Prop({ index: 'text' }) active_ingredient?: string;
  @Prop() manufacturer?: string;
  @Prop({ default: 'medications', index: true }) category: string; // medications|skincare|...
  @Prop({ default: 0 }) price: number;
  @Prop() image?: string;
  @Prop() description_ar?: string;
  @Prop() description_en?: string;
  @Prop({ default: false }) requires_prescription: boolean;
  // Verification status (Rule: unverified entries are still operational)
  @Prop({ default: false }) verified: boolean; // admin approved
  @Prop({ default: 'master' }) source: string; // 'master' | 'patient' | 'doctor' | 'pharmacy'
  @Prop() created_by_user_id?: string;
  @Prop() created_by_role?: string;
  @Prop() approved_by?: string;
  @Prop() approved_at?: Date;
  @Prop() rejected_reason?: string;
  @Prop({ default: 0 }) usage_count: number; // how many times referenced
  @Prop({ index: true }) barcode?: string; // EAN13 / UPC / GTIN
  // ============ MEDICAL INFO (production-ready medicine details) ============
  @Prop() dosage_ar?: string;
  @Prop() dosage_en?: string;
  @Prop({ default: [] }) warnings_ar: string[];
  @Prop({ default: [] }) warnings_en: string[];
  @Prop({ default: [] }) side_effects_ar: string[];
  @Prop({ default: [] }) side_effects_en: string[];
  @Prop({ default: [] }) interactions: string[]; // active ingredients that interact
  @Prop({ default: [] }) contraindications_ar: string[];
  @Prop({ default: [] }) contraindications_en: string[];
  @Prop() form?: string; // tablet | syrup | injection | cream
  @Prop() strength?: string; // 500mg, 5mg/5ml ...
  @Prop({ default: false }) cold_chain: boolean; // needs refrigeration
  @Prop({ default: false }) controlled: boolean; // narcotics
  // ============ INSURANCE ============
  @Prop({ default: [] }) covered_by_insurance: string[]; // insurance company ids
  // ============ GLOBAL AGGREGATES (denormalized for fast list rendering) ============
  @Prop({ default: 0 }) aggregate_stock: number; // total qty across pharmacies
  @Prop({ default: 0 }) pharmacies_count: number; // pharmacies with stock>0
  @Prop({ default: 'none', enum: ['none', 'availability_may_be_limited', 'admin_flagged_shortage'], index: true })
  availability_status: string;
  @Prop() shortage_notes?: string;
  @Prop({ default: false, index: true }) is_deleted: boolean;
  @Prop({ default: 1 }) version: number;
}
export type MedicineDocument = Medicine & Document;
export const MedicineSchema = SchemaFactory.createForClass(Medicine);

MedicineSchema.pre('save', function (next) {
  if (this.isModified('name_ar') || this.isModified('name_en') || !this.slug) {
    const name = this.name_ar || this.name_en || 'item';
    this.slug = buildSlug(name, this.id);
  }
  next();
});
