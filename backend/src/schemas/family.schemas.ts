import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// ─── FamilyMember sub-document ───────────────────────────────────────────────
export class FamilyMember {
  @Prop({ required: true }) user_id: string;
  @Prop({ default: 'member' }) role: string; // 'owner' | 'member'
  /** Permissions the member has been explicitly granted */
  @Prop({ type: [String], default: [] }) permissions: string[];
  // e.g. 'view_health', 'book_appointment', 'view_prescriptions'
  @Prop({ default: () => new Date() }) joined_at: Date;
  @Prop() display_name?: string;
  @Prop() avatar?: string;
}

// ─── FamilyGroup ─────────────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'family_groups' })
export class FamilyGroup extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) owner_id: string;
  @Prop({ required: true }) name: string;
  @Prop({ type: [Object], default: [] }) members: FamilyMember[];
  /** Random short code used to invite others */
  @Prop({ unique: true, sparse: true, index: true }) invite_code?: string;
  /** Invite code expires at */
  @Prop() invite_expires_at?: Date;
  @Prop({ default: false }) is_deleted: boolean;
}
export const FamilyGroupSchema = SchemaFactory.createForClass(FamilyGroup);

// ─── SharedCalendarEvent ─────────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'shared_calendar_events' })
export class SharedCalendarEvent extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) group_id: string;
  @Prop({ required: true }) title: string;
  @Prop() description?: string;
  /**
   * 'appointment' | 'order' | 'lab' | 'reminder' | 'medication'
   */
  @Prop({ default: 'reminder' }) type: string;
  /** Optional reference to the booking / order / lab result */
  @Prop() ref_id?: string;
  @Prop({ required: true }) event_date: Date;
  @Prop({ required: true }) created_by: string; // user_id
  @Prop({ required: true }) member_user_id: string; // whose event it is
  @Prop() member_name?: string; // display label sent by the app
  @Prop() time_label?: string; // display label sent by the app
  @Prop() color?: string;
  @Prop({ default: false }) is_deleted: boolean;
}
export const SharedCalendarEventSchema = SchemaFactory.createForClass(SharedCalendarEvent);

// ─── FamilyPermissionRequest ─────────────────────────────────────────────────
@Schema({ timestamps: true, collection: 'family_permission_requests' })
export class FamilyPermissionRequest extends Document {
  @Prop({ required: true, unique: true, index: true }) id: string;
  @Prop({ required: true, index: true }) group_id: string;
  @Prop({ required: true }) requester_id: string;
  /** The member whose data is being requested */
  @Prop({ required: true }) target_member_id: string;
  /** Which permissions are being requested */
  @Prop({ type: [String], required: true }) requested_permissions: string[];
  /** 'pending' | 'approved' | 'rejected' */
  @Prop({ default: 'pending', index: true }) status: string;
  @Prop() responded_at?: Date;
  @Prop() response_note?: string;
}
export const FamilyPermissionRequestSchema = SchemaFactory.createForClass(FamilyPermissionRequest);
