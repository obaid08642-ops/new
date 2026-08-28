import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProviderDocument = Provider & Document;

@Schema({ timestamps: true })
export class Provider {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ['doctor', 'pharmacy', 'home_care'], required: true })
  type: string;

  @Prop({ required: true, default: false })
  verified: boolean;

  @Prop()
  nationalId: string;

  @Prop()
  commercialCr: string;

  @Prop()
  mohLicense: string;

  @Prop()
  medicalLicense: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);
