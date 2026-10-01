import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Phase 10 medical safety: a queue for AI output a human has to see before a
 * patient does.
 *
 * The platform answers patients with generated content — triage guidance, drug
 * and condition summaries, article drafts. Nothing recorded that output, so a
 * hallucinated dosage or a contraindication reached the patient with no way to
 * audit or retract it afterwards. Every generated artefact lands here instead of
 * going straight to the user: high-risk care levels are published immediately
 * (a patient must not wait for a moderator to be told they may be in danger) but
 * still recorded, while routine content waits for a reviewer.
 */
export type AiContentStatus = 'pending' | 'approved' | 'rejected' | 'auto_published';
export type AiContentKind = 'triage' | 'condition_summary' | 'medicine_summary' | 'article_draft' | 'order_summary' | 'other';

@Schema({ timestamps: true, collection: 'ai_content_review_queue' })
export class AiContentReviewItem {
  @Prop({ default: () => `aic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, index: true })
  id: string;

  @Prop({ required: true, enum: ['triage', 'condition_summary', 'medicine_summary', 'article_draft', 'order_summary', 'other'] })
  kind: AiContentKind;

  /** Who the content was produced for; absent for public/draft content. */
  @Prop({ index: true })
  patient_id?: string;

  /** What the model was asked, kept for audit of the prompt too. */
  @Prop({ default: '' })
  request_summary?: string;

  /** The generated text exactly as it was shown to (or withheld from) the patient. */
  @Prop({ type: String, default: '' })
  content: string;

  /** Care level for triage items; drives the auto-publish decision. */
  @Prop({ default: '' })
  care_level?: string;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'auto_published'], default: 'pending', index: true })
  status: AiContentStatus;

  /** True when the patient was served immediately despite the queue (emergency). */
  @Prop({ default: false })
  published_to_patient?: boolean;

  @Prop()
  reviewed_by?: string;
  @Prop()
  reviewed_at?: Date;
  @Prop({ default: '' })
  review_note?: string;

  @Prop({ type: String, default: '' })
  model?: string;
}

export type AiContentReviewDocument = HydratedDocument<AiContentReviewItem>;
export const AiContentReviewSchema = SchemaFactory.createForClass(AiContentReviewItem);
