import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';

/**
 * Issues #849 / #861: the admin-managed pregnancy week catalogue (weeks 1-42). Each week holds the baby's size line, a short
 * development text (Arabic and English, like articles) and an https image URL on the CDN (owner decision D: nothing is bundled
 * in the apps). Nothing is seeded: a week the admin has not filled or published is answered with null.
 */
@Schema({ timestamps: true, collection: 'pregnancy_weeks' })
export class PregnancyWeek {
  @Prop({ default: () => randomUUID() }) id: string;
  @Prop({ required: true, unique: true, min: 1, max: 42 }) week: number;
  @Prop({ required: true }) size_ar: string;
  @Prop() size_en?: string;
  @Prop({ required: true }) development_ar: string;
  @Prop() development_en?: string;
  @Prop() image_url?: string;
  @Prop({ default: false, index: true }) published: boolean;
  @Prop() published_at?: Date;
  @Prop() created_by?: string;
  @Prop() updated_by?: string;
}
export const PregnancyWeekSchema = SchemaFactory.createForClass(PregnancyWeek);
