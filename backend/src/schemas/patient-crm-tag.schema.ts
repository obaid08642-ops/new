import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'patient_crm_tags' })
export class PatientCrmTag extends Document {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  provider_id: string;

  @Prop({ required: true, index: true })
  patient_id: string;

  @Prop({ default: false })
  is_vip: boolean;

  @Prop({ default: false })
  is_favorite: boolean;

  @Prop({ default: false })
  is_blocked: boolean;

  @Prop()
  blocked_reason?: string;

  @Prop({ default: [] })
  custom_tags: string[];

  @Prop({ default: [] })
  private_notes: string[];
}
export type PatientCrmTagDocument = PatientCrmTag & Document;
export const PatientCrmTagSchema = SchemaFactory.createForClass(PatientCrmTag);
PatientCrmTagSchema.index({ provider_id: 1, patient_id: 1 }, { unique: true });
