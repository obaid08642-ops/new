import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class HomeCareNurse extends Document {
  @Prop({ required: true }) name_ar: string;
  @Prop({ required: true }) name_en: string;
  @Prop({ required: true }) gender: string;
  @Prop({ required: true }) facility_name: string; // المستشفى التابع له
  @Prop({ required: true }) degree: string; // الدرجة العلمية
  @Prop({ required: true }) rating: number;
  @Prop() distance_km: number; // للمسافات
  @Prop({ type: [{ user: String, text: String, rating: Number }] }) reviews: any[];
  @Prop({ type: [String] }) supported_services: string[]; // الرعاية الأساسية والمتقدمة
  @Prop({ type: [String] }) supported_packages: string[]; // باقات الرعاية المستمرة
  @Prop({ type: [String] }) available_frequencies: string[]; // مرة، أسبوعي، شهري
  @Prop({ type: Object }) location: { lat: number, lng: number };
}
export const HomeCareNurseSchema = SchemaFactory.createForClass(HomeCareNurse);
