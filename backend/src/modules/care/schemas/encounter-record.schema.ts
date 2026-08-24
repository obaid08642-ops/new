import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class EncounterRecord {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true, unique: true, index: true })
  appointment_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  patient_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctor_id: Types.ObjectId;

  @Prop({ required: true })
  diagnosis_text: string;

  @Prop({
    type: [{
      medicine_id: { type: Types.ObjectId, ref: 'Medicine' },
      trade_name: String,
      dosage: String,
      duration_days: Number,
      frequency: String
    }],
    default: []
  })
  prescribed_medications: any[];

  @Prop({
    type: {
      status: { type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], default: 'NONE' },
      pre_auth_reference_code: String,
      coverage_percentage: Number,
      patient_copay_amount: Number,
      carrier_name: String
    },
    default: {}
  })
  insurance_claim_snapshot: Record<string, any>;
}
export const EncounterRecordSchema = SchemaFactory.createForClass(EncounterRecord);
