import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'analytics_events' })
export class AnalyticsEvent {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ index: true }) user_id?: string;
  @Prop({ required: true, index: true }) event_type: string; // search, click, page_view, add_to_cart, booking_attempt
  @Prop({ required: true, index: true }) domain: string; // doctor, pharmacy, lab, radiology, nursing, global
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  @Prop({ index: true }) session_id?: string;
  @Prop() ip_address?: string;
  @Prop() user_agent?: string;
}
export type AnalyticsEventDocument = AnalyticsEvent & Document;
export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
