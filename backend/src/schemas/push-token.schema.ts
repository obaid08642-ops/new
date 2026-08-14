import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class PushToken {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ required: true, unique: true }) token: string;
  @Prop({ enum: ['expo', 'fcm', 'apns'], default: 'expo' }) provider: string;
  @Prop() device_id?: string;
  @Prop() platform?: 'ios' | 'android' | 'web';
  @Prop({ default: true }) active: boolean;
  @Prop({ default: Date.now }) last_seen_at: Date;
}
export const PushTokenSchema = SchemaFactory.createForClass(PushToken);
