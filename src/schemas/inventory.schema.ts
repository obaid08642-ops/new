import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'pharmacy_inventory' })
export class PharmacyInventory {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) pharmacy_id: string;
  @Prop({ required: true, index: true }) medicine_id: string;
  @Prop({ default: 0 }) stock_qty: number;
  @Prop({ default: 0 }) reserved_qty: number;
  @Prop() price: number;
  @Prop({ default: true }) is_available: boolean;
  @Prop() last_restocked_at?: Date;
  @Prop() expiry_date?: Date;
}
export type PharmacyInventoryDocument = PharmacyInventory & Document;
export const PharmacyInventorySchema = SchemaFactory.createForClass(PharmacyInventory);
PharmacyInventorySchema.index({ pharmacy_id: 1, medicine_id: 1 }, { unique: true });
