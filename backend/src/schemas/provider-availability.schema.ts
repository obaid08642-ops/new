import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class ProviderAvailability {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true, unique: true }) provider_id: string;
  @Prop({ type: [Object], default: [] }) working_hours: Array<{ day: number; start: string; end: string }>;
  @Prop({ type: [Object], default: [] }) blocked_slots: Array<{ start: Date; end: Date; reason?: string }>;
  @Prop({ type: Object, default: null }) vacation_mode?: { from: Date; to: Date; reason?: string } | null;
  @Prop({ default: true }) instant_available: boolean;
}
export type ProviderAvailabilityDocument = ProviderAvailability & Omit<Document, "id">;

export const ProviderAvailabilitySchema = SchemaFactory.createForClass(ProviderAvailability);
