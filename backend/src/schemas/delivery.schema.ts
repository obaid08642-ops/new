import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DeliveryState } from '../common/enums';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'deliveries' })
export class Delivery {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop() pharmacy_id?: string;
  @Prop() driver_id?: string; // user id with role=delivery
  @Prop({ type: String, enum: Object.values(DeliveryState), default: DeliveryState.UNASSIGNED, index: true })
  state: DeliveryState;
  @Prop({ type: { lat: Number, lng: Number, address: String }, _id: false }) pickup?: any;
  @Prop({ type: { lat: Number, lng: Number, address: String }, _id: false }) dropoff?: any;
  @Prop({ type: { lat: Number, lng: Number }, _id: false }) current_location?: any;
  @Prop({ default: 0 }) attempts: number;
  @Prop() eta_minutes?: number;
  @Prop() fee?: number;
  @Prop() notes?: string;
  @Prop() signature?: string;
  @Prop() photo_proof?: string;
  @Prop() delivered_at?: Date;
}
export type DeliveryDocument = Delivery & Document;
export const DeliverySchema = SchemaFactory.createForClass(Delivery);
