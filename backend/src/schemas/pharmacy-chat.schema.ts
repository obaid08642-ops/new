import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ _id: false })
export class ChatMessage {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true }) sender_id: string;
  @Prop({ required: true }) sender_role: string; // 'patient' or 'pharmacy'
  @Prop() text?: string;
  @Prop() image_url?: string;
  @Prop({ default: Date.now }) created_at: Date;
}
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

@Schema({ timestamps: true, collection: 'pharmacy_chat_threads' })
export class PharmacyChatThread {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) order_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, index: true }) pharmacy_id: string;
  @Prop({ type: [ChatMessageSchema], default: [] }) messages: ChatMessage[];
  @Prop({ type: String, enum: ['ACTIVE', 'READ_ONLY'], default: 'ACTIVE' })
  status: string;
  @Prop({ default: Date.now }) last_message_at: Date;
}

export type PharmacyChatThreadDocument = PharmacyChatThread & Document;
export const PharmacyChatThreadSchema = SchemaFactory.createForClass(PharmacyChatThread);
