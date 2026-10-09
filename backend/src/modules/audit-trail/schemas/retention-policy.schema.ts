import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase 23.5 — retention policies, one document per record class.
 *
 * Collection: `retention_policies`.
 *
 * The owner and the lawyer set the periods; the scheduled job applies them.
 * Overrides land here (via config/service), never hard-coded per call site.
 * Keyed by policy key so the job can resolve any event category to a period.
 */
@Schema({ collection: 'retention_policies', timestamps: true })
export class RetentionPolicy {
  @Prop({ default: () => uuidv4(), unique: true }) id: string;

  /** Policy key: `zatca_tax` | `moh_medical` | `security` | `pdpl_other`. */
  @Prop({ required: true, unique: true, index: true }) key: string;

  @Prop({ required: true }) label: string;

  /** Retention period in days. Events older than this are deleted/anonymized. */
  @Prop({ required: true, min: 1 }) days: number;

  @Prop() updated_by?: string;

  @Prop() note?: string;
}

export type RetentionPolicyDocument = RetentionPolicy & Document;
export const RetentionPolicySchema = SchemaFactory.createForClass(RetentionPolicy);
