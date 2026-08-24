import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HospitalStaffDocument = HospitalStaff & Document;

@Schema({ timestamps: true })
export class HospitalStaff {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  hospital_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'HospitalBranch', index: true })
  branch_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'HospitalDepartment', index: true })
  department_id: Types.ObjectId;

  @Prop({ required: true, enum: ['receptionist', 'branch_admin', 'finance', 'doctor', 'lab_tech'] })
  role: string;

  @Prop({ default: true })
  is_active: boolean;
}

export const HospitalStaffSchema = SchemaFactory.createForClass(HospitalStaff);
