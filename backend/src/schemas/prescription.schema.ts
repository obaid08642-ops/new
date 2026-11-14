import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PrescriptionState } from '../common/enums';
import { v4 as uuid } from 'uuid';
import { healthFieldsPlugin } from '../common/health-fields';

@Schema({ _id: false })
export class PrescriptionItem {
  @Prop() medicine_id?: string; // optional — empty when patient-uploaded item not yet matched
  @Prop() medicine_name_ar?: string;
  @Prop() medicine_name_en?: string;
  @Prop() active_ingredient?: string;
  @Prop() dose?: string; // "1 tablet"
  @Prop() frequency_hours?: number; // every X hours
  @Prop() times_per_day?: number;
  @Prop() duration_days?: number;
  @Prop() quantity?: number;
  @Prop() instructions?: string; // "after meals"
  @Prop({ default: false }) is_manual_entry: boolean;
  // A manual item is prescription-scoped only; it is never a medicines catalog record.
  @Prop({ default: true }) verified: boolean;
  @Prop({ default: 'NOT_APPLICABLE', enum: ['NOT_APPLICABLE', 'PENDING_REVIEW', 'REVIEWED', 'REJECTED', 'SUBSTITUTED_APPROVED'] })
  manual_review_status: string;
  @Prop() manual_reviewed_by?: string;
  @Prop() manual_reviewed_at?: Date;
  @Prop() manual_review_note?: string;
  @Prop({ default: false }) substituted: boolean;
  @Prop() substituted_to_medicine_id?: string;
}
export const PrescriptionItemSchema = SchemaFactory.createForClass(PrescriptionItem);

@Schema({ timestamps: true, collection: 'prescriptions' })
export class Prescription {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ index: true }) doctor_id?: string; // null if uploaded by patient
  @Prop() appointment_id?: string;
  @Prop() upload_image?: string; // when patient uploads scan
  @Prop({ type: [PrescriptionItemSchema], default: [] }) items: PrescriptionItem[];
  @Prop() diagnosis?: string;
  @Prop() notes?: string;
  @Prop({
    type: String,
    enum: Object.values(PrescriptionState),
    default: PrescriptionState.CREATED_BY_DOCTOR,
    index: true,
  })
  state: PrescriptionState;
  @Prop() pharmacy_id?: string;
  @Prop() order_id?: string;
  @Prop({ default: false }) has_manual_entries: boolean;
  /** Pharmacist verification (F19): set when a pharmacist reviews the Rx lines. */
  @Prop() verified_by?: string;
  @Prop() verified_at?: Date;
  /** 22.1: last day the prescription can be used for a refill (set by the prescriber or the pharmacist). Unset = unknown. */
  @Prop() valid_until?: Date;
  /** 22.1: how many more refills the prescription allows. Unset = unknown; a refill is refused until both are set. */
  @Prop() refills_remaining?: number;
}
export type PrescriptionDocument = Prescription & Document;
export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
// 16.9: diagnosis, notes and the dosing instructions are ciphertext at rest
PrescriptionSchema.plugin(healthFieldsPlugin, { registry: 'prescriptions' });
// The doctor's list filtered by appointment (GET /prescriptions/doctor/mine?appointment_id=).
PrescriptionSchema.index({ doctor_id: 1, appointment_id: 1 });
