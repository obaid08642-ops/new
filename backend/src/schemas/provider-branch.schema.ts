import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type ProviderBranchDocument = ProviderBranch & Document;

@Schema({ timestamps: true, collection: 'provider_branches' })
export class ProviderBranch {
  @Prop({ default: () => uuid() })
  _id: string;

  @Prop({ type: String, ref: 'ProviderProfile', required: true, index: true })
  parent_hospital_id: string;

  @Prop({ required: true })
  branch_name_ar: string;

  @Prop({ required: true })
  branch_name_en: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  district: string;

  @Prop({ type: { lat: Number, lng: Number }, required: true, _id: false })
  location: { lat: number; lng: number };

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  doctors_roster: string[];
}
export const ProviderBranchSchema = SchemaFactory.createForClass(ProviderBranch);
