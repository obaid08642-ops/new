import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const CATALOGUE_KINDS = ['medicine', 'lab_test', 'radiology_service', 'nursing_service', 'specialty'] as const;
export type CatalogueKind = (typeof CATALOGUE_KINDS)[number];

/**
 * A GLOBAL concept (a medicine, a lab test, a specialty...) registered in ONE market (blueprint section 6): the concept row keeps what is true
 * everywhere (names, ingredient, parameters), this row says "this market offers it" plus the local code and status. No money fields here: prices stay
 * on the provider offering. Rows are never deleted; a market withdrawing a concept sets `status: 'retired'`.
 */
@Schema({ collection: 'catalogue_registrations', timestamps: true })
export class CatalogueRegistration {
  @Prop({ type: String, required: true, enum: CATALOGUE_KINDS }) kind: CatalogueKind;
  @Prop({ required: true }) concept_id: string;
  @Prop({ required: true }) market_id: string;
  /** The market's own code (regulator registration number, local test code), if it has one. */
  @Prop({ type: String, default: null }) local_code: string | null;
  @Prop({ type: String, required: true, enum: ['active', 'retired'], default: 'active' }) status: 'active' | 'retired';
  @Prop({ required: true }) effective_from: Date;
  @Prop({ type: String, default: null }) created_by: string | null;
}
export type CatalogueRegistrationDocument = CatalogueRegistration & Document;
export const CatalogueRegistrationSchema = SchemaFactory.createForClass(CatalogueRegistration);
CatalogueRegistrationSchema.index({ kind: 1, concept_id: 1, market_id: 1 }, { unique: true });
CatalogueRegistrationSchema.index({ market_id: 1, kind: 1, status: 1 });
