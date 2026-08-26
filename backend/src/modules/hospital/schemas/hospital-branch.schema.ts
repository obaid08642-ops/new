import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HospitalBranchDocument = HospitalBranch & Document;

@Schema({ timestamps: true })
export class HospitalBranch {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  hospital_id: Types.ObjectId;

  @Prop({ required: true })
  name_ar: string;

  @Prop({ required: true })
  name_en: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  district: string;

  @Prop({ type: { latitude: Number, longitude: Number }, required: true })
  coordinates: { latitude: number; longitude: number };

  @Prop({ required: true })
  contact_number: string;

  @Prop({ default: true })
  is_active: boolean;
}

export const HospitalBranchSchema = SchemaFactory.createForClass(HospitalBranch);
