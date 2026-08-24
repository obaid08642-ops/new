import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

@Schema({ timestamps: true, collection: 'chat_sessions' })
export class ChatSession {
  @Prop({ required: true, enum: ['CLINICAL', 'FAMILY'], index: true })
  type: string;

  @Prop({ type: String, ref: 'Appointment', default: null, index: true })
  appointment_id: string;

  @Prop({ type: String, ref: 'FamilyGroup', default: null, index: true })
  family_group_id: string;

  @Prop({
    required: true,
    enum: ['WAITING_FOR_DOCTOR', 'LIVE', 'FOLLOW_UP', 'CLOSED'],
    default: 'WAITING_FOR_DOCTOR',
    index: true
  })
  status: string;
}
export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
