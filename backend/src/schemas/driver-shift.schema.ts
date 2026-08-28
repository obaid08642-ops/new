import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * DriverShift — represents a driver's on-duty period. New shift created on "go online",
 * closed on "go offline". Last shift's `current_location` reflects live driver position.
 */
@Schema({ timestamps: true })
export class DriverShift {
  @Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) driver_id: string;
  @Prop({ default: 'online', enum: ['online', 'offline', 'on_delivery'] }) status: string;
  @Prop() started_at: Date;
  @Prop() ended_at?: Date;
  @Prop({ type: Object, default: null }) current_location?: { lat: number; lng: number; heading?: number; speed?: number; at?: Date };
  @Prop({ default: 0 }) deliveries_completed: number;
  @Prop({ default: 0 }) earnings: number;
}
export type DriverShiftDocument = DriverShift & Document;
export const DriverShiftSchema = SchemaFactory.createForClass(DriverShift);
