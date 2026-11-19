import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MarketConfig, MarketStatus } from './market-config.types';

@Schema({ collection: 'markets', timestamps: true })
export class Market {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) country: string;
  @Prop({ required: true }) operator_id: string;
  @Prop({ type: String, required: true, enum: ['draft', 'internal_test', 'pilot', 'live', 'suspended'] }) status: MarketStatus;
}
export type MarketDocument = Market & Document;
export const MarketSchema = SchemaFactory.createForClass(Market);

@Schema({ collection: 'operators', timestamps: true })
export class Operator {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ type: String, default: null }) legal_name: string | null;
  @Prop({ type: String, default: null }) tax_registration: string | null;
}
export type OperatorDocument = Operator & Document;
export const OperatorSchema = SchemaFactory.createForClass(Operator);

/** Immutable: a change is a new row with the next `version`. */
@Schema({ collection: 'market_configs', timestamps: true })
export class MarketConfigRow {
  @Prop({ required: true }) market_id: string;
  @Prop({ required: true }) version: number;
  @Prop({ required: true }) effective_from: Date;
  @Prop({ type: String, required: true, enum: ['active', 'retired'], default: 'active' }) status: 'active' | 'retired';
  @Prop({ type: Object, required: true }) config: MarketConfig; // typed + validated by validateMarketConfig before every write
  @Prop({ type: String, default: null }) created_by: string | null;
}
export type MarketConfigRowDocument = MarketConfigRow & Document;
export const MarketConfigRowSchema = SchemaFactory.createForClass(MarketConfigRow);
MarketConfigRowSchema.index({ market_id: 1, version: 1 }, { unique: true });
