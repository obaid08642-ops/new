import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type TreatmentProgramDocument = TreatmentProgram & Document;

@Schema({ timestamps: true, collection: 'treatment_programs' })
export class TreatmentProgram {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, index: true })
  patientId: string;

  @Prop({ required: true, enum: ['diabetes', 'hypertension', 'pregnancy'], index: true })
  programType: 'diabetes' | 'hypertension' | 'pregnancy';

  @Prop({ required: true, enum: ['active', 'completed'], default: 'active', index: true })
  status: 'active' | 'completed';

  @Prop({ type: [String], default: [] })
  completedSteps: string[];

  @Prop({ required: true, index: true })
  nextSchedule: Date;
}

export const TreatmentProgramSchema = SchemaFactory.createForClass(TreatmentProgram);
TreatmentProgramSchema.index({ patientId: 1, programType: 1 }, { unique: true });
