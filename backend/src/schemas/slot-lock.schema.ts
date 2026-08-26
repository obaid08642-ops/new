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
// F-C5: non-unique index allowed two concurrent holds on the same provider+slot.
// Partial-unique index makes double-hold physically impossible while leaving
// released/expired rows free for future bookings on the same slot.
SlotLockSchema.index(
  { provider_id: 1, slot_start: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['held', 'confirmed'] } } },
);
