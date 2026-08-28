import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SystemConfigExtendedDocument = SystemConfigExtended & Document;

@Schema({ timestamps: true })
export class SystemConfigExtended {
  @Prop({ required: true, unique: true, index: true })
  config_key: string; // e.g., 'GLOBAL_SLA_TIMERS' | 'SYSTEM_KILL_SWITCH_ACTIVE'

  @Prop({ type: Object, required: true })
  config_value_matrix: Record<string, any>; // Stores key-value sets mapping configuration variables

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  last_modified_by_admin_id: Types.ObjectId;
}

export const SystemConfigExtendedSchema = SchemaFactory.createForClass(SystemConfigExtended);
