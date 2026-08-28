import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class CallMetric {
  @Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) session_id: string;
  @Prop({ required: true, index: true }) participant_id: string;
  @Prop() bitrate_kbps?: number;
  @Prop() packet_loss_pct?: number;
  @Prop() jitter_ms?: number;
  @Prop() rtt_ms?: number;
  @Prop() quality_score?: number; // 1..5 MOS-like
  @Prop({ type: Object, default: {} }) raw?: any;
}
export type CallMetricDocument = CallMetric & Omit<Document, 'id'>;
export const CallMetricSchema = SchemaFactory.createForClass(CallMetric);
