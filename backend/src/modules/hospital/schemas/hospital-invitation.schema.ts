import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

export type HospitalInvitationDocument = HospitalInvitation & Document;

/**
 * Facility → provider invitation (additive feature).
 * A facility (hospital/clinic account) invites a provider (doctor etc.) by
 * phone / email / user id; the invitee accepts or rejects from their own
 * dashboard. On accept, a HospitalStaff record links the two accounts.
 */
@Schema({ timestamps: true, collection: 'facility_invitations' })
export class HospitalInvitation {
  @Prop({ default: () => uuid() }) id: string;

  // Facility account (users.id uuid of the hospital/clinic)
  @Prop({ required: true, index: true }) facility_id: string;

  // Invitee provider account (users.id uuid), resolved at creation time
  @Prop({ required: true, index: true }) invitee_id: string;

  // What the facility typed (phone / email / id) — kept for audit
  @Prop() invitee_identifier: string;

  @Prop({ default: 'doctor' }) role: string;

  // Permission matrix chosen on the invitation form (whitelisted keys)
  @Prop({ type: Object, default: {} }) permissions: Record<string, boolean>;

  @Prop({ enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending', index: true })
  status: string;

  @Prop() responded_at?: Date;
}

export const HospitalInvitationSchema = SchemaFactory.createForClass(HospitalInvitation);
