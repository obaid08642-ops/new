import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type CorporateAccountDocument = CorporateAccount & Document;

@Schema({ timestamps: true, collection: 'corporate_accounts' })
export class CorporateAccount {
  @Prop({ default: () => uuid(), unique: true })
  id: string;

  @Prop({ required: true, unique: true, index: true })
  companyName: string;

  @Prop({ required: true, default: 0 })
  employeeLimit: number;

  @Prop({ required: true, default: 0 })
  individualCreditLimit: number;

  @Prop({ required: true, default: 0 })
  usedCredit: number;

  @Prop({ required: true })
  billingCycleEnd: Date;
}

export const CorporateAccountSchema = SchemaFactory.createForClass(CorporateAccount);
