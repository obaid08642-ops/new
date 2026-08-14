import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HospitalDepartmentDocument = HospitalDepartment & Document;

@Schema({ timestamps: true })
export class HospitalDepartment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  hospital_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'HospitalBranch', required: true, index: true })
  branch_id: Types.ObjectId;

  @Prop({ required: true })
  name_ar: string;

  @Prop({ required: true })
  name_en: string;

  @Prop({ required: true })
  specialty_code: string;

  @Prop({ default: 0 })
  consultation_fee: number;

  @Prop({ default: true })
  is_active: boolean;
}

export const HospitalDepartmentSchema = SchemaFactory.createForClass(HospitalDepartment);
