import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType, NotificationPriority } from '../common/enums';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ default: () => uuid() }) id: string;
  @Prop() user_id?: string;
  @Prop() role?: string; // broadcast to role
  @Prop({ required: true }) title_key: string; // i18n key
  @Prop({ required: true }) body_key: string;
  @Prop({ type: Object, default: {} }) params: Record<string, any>; // for interpolation
  @Prop({ type: String, enum: Object.values(NotificationType), default: NotificationType.INFO })
  type: NotificationType;
  @Prop({ type: String, enum: Object.values(NotificationPriority), default: NotificationPriority.NORMAL })
  priority: NotificationPriority;
  @Prop({ type: Object }) action?: { route?: string; payload?: any };
  @Prop({ default: [] }) read_by: string[];
  @Prop({ default: false }) sent_push: boolean;
  // M6 / ER-8: delivery tracking — per-channel status, scheduling, retries
  @Prop({ type: Object, default: {} }) delivery: Record<string, { status: string; attempts: number; last_error?: string; sent_at?: Date }>;
  @Prop() scheduled_at?: Date; // future → queued until due
  @Prop({ default: 'PENDING', index: true }) status: string; // PENDING|SCHEDULED|SENT|PARTIAL|FAILED
}
export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ user_id: 1, createdAt: -1 });
NotificationSchema.index({ role: 1, createdAt: -1 });
