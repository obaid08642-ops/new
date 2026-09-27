import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

/** P6.x-7: supported template languages (matches F32 app locales). */
export const TEMPLATE_LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;

@Schema({ timestamps: true, collection: 'notification_templates' })
export class NotificationTemplate {
  @Prop({ default: () => uuid(), unique: true }) id: string;
  @Prop({ required: true, unique: true }) key: string;
  @Prop({ type: Object, default: {} }) title: Record<string, string>;
  @Prop({ type: Object, default: {} }) body: Record<string, string>;
  @Prop({ default: true }) active: boolean;
  @Prop() updated_by?: string;
}
export type NotificationTemplateDocument = NotificationTemplate & Document;
export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);
