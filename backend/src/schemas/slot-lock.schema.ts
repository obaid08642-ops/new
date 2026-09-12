import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type SlotLockDocument = SlotLock & Document;

@Schema({ timestamps: true })
export class SlotLock {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) provider_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) booking_kind: string;
  @Prop({ required: true }) slot_start: Date;
  @Prop({ required: true }) slot_end: Date;
  @Prop({ default: 'held' }) status: 'held' | 'confirmed' | 'released' | 'expired';
  @Prop({ required: true, index: { expires: 0 } }) expires_at: Date;
  @Prop() booking_id?: string;
}
export const SlotLockSchema = SchemaFactory.createForClass(SlotLock);
SlotLockSchema.index({ provider_id: 1, slot_start: 1, status: 1 });
// Exact-duplicate guard: concurrent reserves for the same provider+slot can
// never both create a held/confirmed lock (storage-level, no topology dep).
// Range overlaps remain best-effort via the service check + appointment index.
SlotLockSchema.index(
  { provider_id: 1, slot_start: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['held', 'confirmed'] } } },
);
