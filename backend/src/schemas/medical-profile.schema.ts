import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum BloodType {
  A_POS = 'A+', A_NEG = 'A-', B_POS = 'B+', B_NEG = 'B-',
  AB_POS = 'AB+', AB_NEG = 'AB-', O_POS = 'O+', O_NEG = 'O-', UNKNOWN = 'unknown',
}

/**
 * Patient Medical Profile — visible to authorized providers (doctors, pharmacists, labs)
 * during consultations, prescribing, refill, and lab requests.
 */
@Schema({ timestamps: true })
export class MedicalProfile extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true, index: true }) patient_id: string;

  // Demographics & physiology
  @Prop() blood_type?: string; // BloodType
  @Prop() height_cm?: number;
  @Prop() weight_kg?: number;
  @Prop() birth_date?: Date;
  @Prop({ default: 'unspecified' }) gender: string; // male | female | unspecified
  @Prop({ default: false }) is_pregnant: boolean;
  @Prop() pregnancy_weeks?: number;
  @Prop({ default: false }) is_breastfeeding: boolean;
  @Prop({ default: false }) is_smoker: boolean;
  @Prop({ default: false }) drinks_alcohol: boolean;

  // Chronic conditions — [{name_ar, name_en?, since?, severity?, controlled?, notes?}]
  @Prop({ default: [] }) chronic_diseases: any[];

  // Allergies — [{name_ar, kind: drug|food|environment, severity: mild|moderate|severe, reaction?}]
  @Prop({ default: [] }) allergies: any[];

  // Past surgeries — [{name_ar, date?, hospital?, notes?}]
  @Prop({ default: [] }) surgeries: any[];

  // Long-term / chronic medications — [{name_ar, dose, frequency, since?, prescribed_by?}]
  @Prop({ default: [] }) long_term_medications: any[];

  // Family history — [{relation, condition_ar}]
  @Prop({ default: [] }) family_history: any[];

  // Emergency contact
  @Prop({ type: Object }) emergency_contact?: { name?: string; phone?: string; relation?: string };

  // Other notes for doctors
  @Prop() notes?: string;

  // Audit
  @Prop() last_updated_at?: Date;
  @Prop() last_updated_by_id?: string;
}
export const MedicalProfileSchema = SchemaFactory.createForClass(MedicalProfile);
