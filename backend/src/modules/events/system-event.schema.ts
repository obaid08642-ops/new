import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * SystemEvent — append-only audit/event log for admin observability.
 * Phase 2 hardening: every domain mutation emits a SystemEvent.
 */
@Schema({ timestamps: true, collection: 'system_events' })
export class SystemEvent extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) type: string; // e.g. order.created
  @Prop({ required: true, index: true }) entity_type: string; // order | allocation | broadcast | chat | shortage
  @Prop({ required: true, index: true }) entity_id: string;
  /** Stable command key for exactly-once durable event recording. */
  @Prop({ unique: true, sparse: true, index: true }) idempotency_key?: string;
  @Prop({ index: true }) actor_account_id?: string;
  @Prop({ index: true }) actor_role?: string; // patient | provider | admin | system
  @Prop({ index: true }) reason_code?: string;
  @Prop({ index: true }) patient_account_id?: string;
  @Prop({ index: true }) pharmacy_account_id?: string;
  @Prop({ type: Object }) before?: any;
  @Prop({ type: Object }) after?: any;
  @Prop({ type: Object }) meta?: any;
}
export const SystemEventSchema = SchemaFactory.createForClass(SystemEvent);
SystemEventSchema.index({ entity_type: 1, entity_id: 1, createdAt: -1 });
SystemEventSchema.index({ patient_account_id: 1, createdAt: -1 });
SystemEventSchema.index({ pharmacy_account_id: 1, createdAt: -1 });
SystemEventSchema.index({ type: 1, createdAt: -1 });
