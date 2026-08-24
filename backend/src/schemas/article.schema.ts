import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';

/**
 * M6 / SEO-2 + ER-2: health articles (multilingual content hub).
 * Published articles are auto-indexable via /seo/meta/article/:slug + sitemap.
 */
@Schema({ timestamps: true })
export class Article {
  @Prop({ default: () => randomUUID() }) id: string;
  @Prop({ unique: true }) slug: string;
  @Prop({ required: true, index: 'text' }) title_ar: string;
  @Prop({ index: 'text' }) title_en?: string;
  @Prop() excerpt_ar?: string;
  @Prop() excerpt_en?: string;
  @Prop() body_ar?: string;
  @Prop() body_en?: string;
  @Prop({ index: true }) category?: string; // صحة عامة · أمومة وطفولة · تغذية · أمراض مزمنة · صحة نفسية
  @Prop({ default: [] }) tags: string[];
  @Prop() cover_image?: string;
  @Prop() author_name?: string;
  @Prop() author_title?: string; // طبيب / أخصائي تغذية / ...
  @Prop({ default: 'DRAFT', index: true }) status: string; // DRAFT | PUBLISHED
  @Prop({ index: true }) published_at?: Date;
  @Prop() seo_description_ar?: string;
  @Prop() seo_description_en?: string;
  @Prop({ default: 0 }) views: number;
  @Prop({ default: false }) is_deleted: boolean;
}
export const ArticleSchema = SchemaFactory.createForClass(Article);
ArticleSchema.index({ status: 1, published_at: -1 });
