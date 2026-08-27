import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';

export enum LabResultType {
  STRUCTURED = 'STRUCTURED',
  PDF = 'PDF',
  IMAGE = 'IMAGE',
  RADIOLOGY = 'RADIOLOGY',
}

@Schema({ timestamps: true })
export class LabResult extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId(TRACK_PREFIX.lab_result) }) tracking_id: string;
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() service_id?: string;
  @Prop({ required: true }) service_name_ar: string;
  @Prop() service_name_en?: string;
  @Prop({ required: true, enum: Object.values(LabResultType) }) type: LabResultType;
  // Source discriminator for clean separation in lists/timeline/filters
  @Prop({ default: 'labs', enum: ['labs', 'radiology'], index: true }) source: 'labs' | 'radiology';

  // STRUCTURED entries [{name_ar, value, unit, ref_low, ref_high, flag: normal|low|high|critical, notes}]
  @Prop({ default: [] }) entries: any[];
  
  // PDF / Image attachments
  @Prop({ default: [] }) attachments: any[]; // [{name, base64, mime}]

  // RADIOLOGY-specific
  @Prop() findings?: string;
  @Prop() impression?: string;
  @Prop() recommendations?: string;

  @Prop() reported_at?: Date;
  @Prop() reported_by_id?: string;
  @Prop() reported_by_name?: string;
  @Prop({ default: false }) critical: boolean;
  @Prop({ default: false }) viewed_by_patient: boolean;
  @Prop() patient_viewed_at?: Date;
  @Prop() notes?: string;
}
export const LabResultSchema = SchemaFactory.createForClass(LabResult);
LabResultSchema.index({ patient_id: 1, createdAt: -1 });
// `booking_id` is indexed by its @Prop declaration above; do not duplicate it here.
