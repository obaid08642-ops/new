import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'system_configs' })
export class SystemConfig {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, unique: true, index: true }) key: string;
  @Prop({ type: Object, required: true }) value: any;
}

export type SystemConfigDocument = SystemConfig & Document;
export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
