import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * R77: governed manual merchandising layer — physically separate from the
 * organic ranking engine (product-ranking.service: "manual boosts live in
 * a different layer, never here"). Boosts NEVER reorder organic results;
 * consumers attach a labeled `sponsored` flag only.
 */
@Schema({ collection: 'manual_boosts', timestamps: true })
export class ManualBoost {
  @Prop({ required: true, index: true }) entity_type: string;
  @Prop({ required: true, index: true }) entity_id: string;
  @Prop({ required: true, default: 1 }) weight: number;
  @Prop() reason?: string;
  @Prop({ required: true }) starts_at: Date;
  @Prop({ required: true }) ends_at: Date;
  @Prop({ default: 'active', enum: ['active', 'revoked'], index: true }) status: string;
  @Prop() created_by?: string;
}
export type ManualBoostDocument = ManualBoost & Document;
export const ManualBoostSchema = SchemaFactory.createForClass(ManualBoost);
ManualBoostSchema.index({ entity_type: 1, entity_id: 1, status: 1 });
