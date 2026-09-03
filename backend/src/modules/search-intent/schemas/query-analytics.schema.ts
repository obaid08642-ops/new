import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QueryAnalyticsDocument = QueryAnalytics & Document;

@Schema({ collection: 'query_analytics', timestamps: { createdAt: 'created_at', updatedAt: false } })
export class QueryAnalytics {
  @Prop({ required: true, index: true })
  raw_query: string;

  @Prop({ required: true, index: true })
  normalized_query: string;

  @Prop({ required: true, default: 'ar', index: true })
  locale: string;

  @Prop({ required: false, index: true })
  detected_intent?: string;

  @Prop({ required: false, index: true })
  detected_entity_type?: string;

  @Prop({ required: false, index: true })
  resolved_location_code?: string;

  @Prop({ required: false, default: 0 })
  results_count: number;

  @Prop({ required: true, enum: ['web', 'mobile', 'ai', 'mcp'], default: 'web', index: true })
  client_type: string;

  @Prop({ default: Date.now, index: true })
  created_at: Date;
}

export const QueryAnalyticsSchema = SchemaFactory.createForClass(QueryAnalytics);
QueryAnalyticsSchema.index({ created_at: -1, results_count: 1 });
