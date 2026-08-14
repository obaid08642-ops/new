import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaternityProfileDocument = MaternityProfile & Document;

@Schema()
export class Checkup {
  @Prop({ required: true })
  week: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: false })
  done: boolean;
}

export const CheckupSchema = SchemaFactory.createForClass(Checkup);

@Schema()
export class KickLog {
  @Prop({ default: () => new Types.ObjectId() })
  id: Types.ObjectId;

  @Prop({ required: true })
  count: number;

  @Prop({ required: true })
  duration_seconds: number;

  @Prop({ default: Date.now })
  date: Date;
}
export const KickLogSchema = SchemaFactory.createForClass(KickLog);

@Schema()
export class ContractionLog {
  @Prop({ default: () => new Types.ObjectId() })
  id: Types.ObjectId;

  @Prop({ required: true })
  interval_seconds: number;

  @Prop({ required: true })
  duration_seconds: number;

  @Prop({ default: Date.now })
  date: Date;
}
export const ContractionLogSchema = SchemaFactory.createForClass(ContractionLog);

@Schema()
export class InfantGrowthLog {
  @Prop({ default: () => new Types.ObjectId() })
  id: Types.ObjectId;

  @Prop({ required: true })
  month: number;

  @Prop()
  weight_kg: number;

  @Prop()
  height_cm: number;

  @Prop()
  head_circ_cm: number;

  @Prop({ default: Date.now })
  date: Date;
}
export const InfantGrowthLogSchema = SchemaFactory.createForClass(InfantGrowthLog);

@Schema({ timestamps: true })
export class MaternityProfile {
  @Prop({ type: String, required: true, unique: true })
  patient_id: string;

  @Prop({ default: false })
  is_pregnant: boolean;

  @Prop()
  due_date: Date;

  @Prop()
  last_period_date: Date;

  @Prop()
  prev_period_date: Date;

  @Prop({ default: 28 })
  cycle_length: number;

  @Prop({ default: true })
  is_regular: boolean;

  @Prop({ default: 0 })
  current_week: number;

  @Prop({ type: [CheckupSchema], default: [] })
  checkups: Checkup[];

  @Prop({ type: [KickLogSchema], default: [] })
  kicks_log: KickLog[];

  @Prop({ type: [ContractionLogSchema], default: [] })
  contractions_log: ContractionLog[];

  @Prop({ type: [InfantGrowthLogSchema], default: [] })
  infant_growth: InfantGrowthLog[];
}

export const MaternityProfileSchema = SchemaFactory.createForClass(MaternityProfile);
