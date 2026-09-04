import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type ProductRankingMetricsDocument = ProductRankingMetrics & Document;

@Schema({ timestamps: true, collection: 'product_ranking_metrics' })
export class ProductRankingMetrics {
  @Prop({ default: () => uuid(), index: true })
  id!: string;

  @Prop({ required: true, index: true })
  drug_id!: string;

  @Prop({ index: true, default: 'global' })
  pharmacy_id!: string; // 'global' or specific pharmacy UUID

  @Prop({ required: true, index: true, default: 'general' })
  category!: string;

  @Prop({ default: 0 })
  views_count!: number;

  @Prop({ default: 0 })
  searches_count!: number;

  @Prop({ default: 0 })
  clicks_count!: number;

  @Prop({ default: 0 })
  cart_adds_count!: number;

  @Prop({ default: 0 })
  purchases_count!: number;

  @Prop({ default: 0 })
  wishlist_adds_count!: number;

  @Prop({ default: 0 })
  conversion_rate!: number;

  @Prop({ default: 0, index: true })
  composite_score!: number;

  @Prop({ default: 0, index: true })
  trending_score!: number;

  @Prop({ default: 'in_stock', index: true })
  availability_status!: string; // 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued'

  @Prop({ default: Date.now })
  last_event_at!: Date;

  @Prop({ default: Date.now })
  first_published_at!: Date;
}

export const ProductRankingMetricsSchema = SchemaFactory.createForClass(ProductRankingMetrics);

// Compound indexes for high-speed multi-dimensional scope queries
ProductRankingMetricsSchema.index({ drug_id: 1, pharmacy_id: 1 }, { unique: true });
ProductRankingMetricsSchema.index({ pharmacy_id: 1, composite_score: -1 });
ProductRankingMetricsSchema.index({ pharmacy_id: 1, category: 1, composite_score: -1 });
ProductRankingMetricsSchema.index({ pharmacy_id: 1, trending_score: -1 });
