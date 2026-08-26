import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'pharmacy_inventory' })
export class PharmacyInventory {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) pharmacy_id: string;
  @Prop({ required: true, index: true }) drug_id: string;
  @Prop({ required: true }) price: number;
  @Prop({ default: 0 }) stock_quantity: number;
  @Prop({ default: true }) is_online: boolean;
  @Prop() expiry_date?: Date;
}

export type PharmacyInventoryDocument = PharmacyInventory & Document;
export const PharmacyInventorySchema = SchemaFactory.createForClass(PharmacyInventory);
PharmacyInventorySchema.index({ pharmacy_id: 1, drug_id: 1 }, { unique: true });
