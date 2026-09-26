import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HospitalSubEntityDocument = HospitalSubEntity & Document;

@Schema({ timestamps: true })
export class HospitalSubEntity {
  @Prop({ type: Types.ObjectId, ref: 'ProviderProfile', required: true, index: true })
  parent_hospital_id: Types.ObjectId; // Parent enterprise organization reference

  @Prop({ type: Types.ObjectId, ref: 'ProviderBranch', required: true, index: true })
  assigned_branch_id: Types.ObjectId; // Location branch assignment reference

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  sub_entity_user_id: Types.ObjectId; // The user credential account passport id

  @Prop({
    required: true,
    enum: ['INTERNAL_PHARMACY', 'INTERNAL_LAB', 'INTERNAL_RADIOLOGY', 'BRANCH_DOCTOR', 'RECEPTIONIST']
  })
  entity_type: string;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: [String], default: [] })
  custom_branch_permissions: string[]; // Grants fine-grained view permissions
}
export const HospitalSubEntitySchema = SchemaFactory.createForClass(HospitalSubEntity);
