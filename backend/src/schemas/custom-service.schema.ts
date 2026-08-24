import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../common/tracking';

export enum CustomServiceStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  ADDED_TO_CATALOG = 'ADDED_TO_CATALOG',
  PROVIDED = 'PROVIDED',
  REJECTED = 'REJECTED',
}

export enum CustomServiceKind {
  LAB = 'LAB',
  RADIOLOGY = 'RADIOLOGY',
  HOME_CARE = 'HOME_CARE',
  PHARMACY = 'PHARMACY',
}

/**
 * Patient-submitted request for a service not yet in catalog.
 * Examples:
 *  - lab test "نسبة الصفائح" not listed
 *  - home-care service not listed
 *  - medicine prescribed by doctor not in pharmacy DB
 *
 * Workflow:
 *   patient -> PENDING (admin + provider notified)
 *   admin reviews -> REVIEWED / APPROVED / REJECTED
 *   approved -> ADDED_TO_CATALOG (entry created in respective catalog)
 *   provider provides -> PROVIDED (linked to booking)
 */
@Schema({ timestamps: true })
export class CustomServiceRequest extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ unique: true, default: () => trackingId('CSR') }) tracking_id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() patient_name?: string;
  @Prop() patient_phone?: string;
  @Prop({ required: true, enum: Object.values(CustomServiceKind) }) kind: CustomServiceKind;
  @Prop({ required: true }) name_ar: string;
  @Prop() name_en?: string;
  @Prop() doctor_notes?: string; // free-text: what doctor wrote
  @Prop({ default: [] }) attachments: any[]; // [{name, base64, mime}]
  @Prop() doctor_name?: string;
  @Prop() prescription_image?: string; // base64 photo of doctor's note
  @Prop({ default: CustomServiceStatus.PENDING, enum: Object.values(CustomServiceStatus) }) status: CustomServiceStatus;
  @Prop({ default: [] }) status_history: any[]; // [{from,to,by_user_id,by_role,at,note}]

  // Link to provider that picks up the request
  @Prop() assigned_provider_id?: string;
  @Prop() assigned_provider_name?: string;

  // Link to booking when service is provided
  @Prop() linked_booking_id?: string;
  @Prop() linked_order_id?: string;

  @Prop() admin_notes?: string;
  @Prop() resolved_at?: Date;
  @Prop({ default: 'medium' }) priority: string;
}
export const CustomServiceRequestSchema = SchemaFactory.createForClass(CustomServiceRequest);
CustomServiceRequestSchema.index({ patient_id: 1, createdAt: -1 });
CustomServiceRequestSchema.index({ status: 1, kind: 1, createdAt: -1 });
