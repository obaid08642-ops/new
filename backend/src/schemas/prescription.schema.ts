import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PrescriptionState } from '../common/enums';
import { v4 as uuid } from 'uuid';

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
  // A manual item is prescription-scoped only; it is never a medicines_master record.
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
}
export type PrescriptionDocument = Prescription & Document;
export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
