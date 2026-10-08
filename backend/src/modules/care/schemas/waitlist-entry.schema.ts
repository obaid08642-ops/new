import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

/**
 * P22.6 — persistent appointment waitlist.
 * One row per (patient, doctor, date) while active; cancellation of a booking
 * flips the oldest WAITING row to OFFERED atomically (exactly one winner).
 */
@Schema({ timestamps: true, collection: 'appointment_waitlist' })
export class WaitlistEntry {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) doctor_id: string;
  @Prop({ required: true, index: true }) slot_date: string; // YYYY-MM-DD (appointment slot day)
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ type: String, enum: ['WAITING', 'OFFERED', 'CONSUMED', 'EXPIRED', 'LEFT'], default: 'WAITING', index: true })
  status: string;
  @Prop() offer_expires_at?: Date;
  @Prop() offered_slot_start?: Date; // the freed slot the patient may take
  @Prop({ unique: true, sparse: true, index: true }) idempotency_key?: string;
}
export type WaitlistEntryDocument = WaitlistEntry & Document;
export const WaitlistEntrySchema = SchemaFactory.createForClass(WaitlistEntry);
WaitlistEntrySchema.index({ doctor_id: 1, slot_date: 1, status: 1, createdAt: 1 });
