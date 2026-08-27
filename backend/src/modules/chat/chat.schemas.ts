import { Prop, Schema as NSchema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

// ─── Schemas ────────────────────────────────────────────────────────────────

@NSchema({ timestamps: true, collection: 'chat_threads' })
export class ChatThread {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true, enum: ['direct', 'group', 'booking'] }) type: string;
  @Prop({ type: [String], required: true, index: true }) participant_ids: string[];
  @Prop() name?: string;
  @Prop() avatar_url?: string;
  @Prop() booking_kind?: string;
  @Prop() booking_id?: string;
  @Prop() last_message?: string;
  @Prop() last_message_at?: Date;
  @Prop() last_message_sender_id?: string;
  @Prop({ type: Object, default: {} }) unread_counts: Record<string, number>;
  @Prop({ default: true }) is_active: boolean;
  @Prop() created_by?: string;
}
export type ChatThreadDocument = ChatThread & Document;
export const ChatThreadSchema = SchemaFactory.createForClass(ChatThread);
ChatThreadSchema.index({ participant_ids: 1 });
ChatThreadSchema.index({ booking_kind: 1, booking_id: 1 });

@NSchema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessage {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ unique: true, sparse: true, index: true }) client_message_id?: string;
  @Prop({ required: true, index: true }) thread_id: string;
  @Prop({ required: true }) sender_id: string;
  @Prop({ required: true }) sender_role: string;
  @Prop({ default: '' }) body: string;
  @Prop({ default: 'text', enum: ['text', 'image', 'voice', 'file', 'system'] }) type: string;
  @Prop() attachment_url?: string;
  @Prop() attachment_mime?: string;
  @Prop() attachment_name?: string;
  @Prop() attachment_size?: number;
  @Prop() duration_seconds?: number; // voice note
  @Prop() reply_to_id?: string;
  @Prop() forwarded_from_id?: string;
  @Prop({ type: [String], default: [] }) media_ids: string[];
  @Prop({ type: Object, default: {} }) reactions: Record<string, string[]>; // emoji -> user_ids
  @Prop({ type: [String], default: [] }) read_by: string[];
  @Prop({ type: [String], default: [] }) delivered_to: string[];
  @Prop({ default: false }) is_edited: boolean;
  @Prop() edited_at?: Date;
  @Prop({ default: false }) is_deleted: boolean;
  @Prop() deleted_at?: Date;
  @Prop({ default: false }) is_pinned: boolean;
}
export type ChatMessageDocument = ChatMessage & Document;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ thread_id: 1, createdAt: -1 });
ChatMessageSchema.index({ thread_id: 1, is_deleted: 1 });
ChatMessageSchema.index({ body: 'text' });
