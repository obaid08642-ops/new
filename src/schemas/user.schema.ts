import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../common/enums';
import { v4 as uuid } from 'uuid';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ default: () => uuid() }) id: string;
  @Prop() full_name: string;
  @Prop({ unique: true, sparse: true }) phone: string;
  @Prop({ unique: true, sparse: true }) email?: string;
  @Prop() password_hash?: string;
  @Prop({ type: String, enum: Object.values(UserRole), default: UserRole.PATIENT }) role: UserRole;
  @Prop({ default: true }) active: boolean;
  @Prop({ default: false }) is_guest: boolean;
  @Prop() deleted_at?: Date;
  @Prop() avatar?: string;
  @Prop() city?: string;
  @Prop() district?: string;
  @Prop({ type: { lat: Number, lng: Number }, _id: false }) location?: { lat: number; lng: number };
  @Prop({ default: 'ar' }) preferred_lang: string;
  /** Opaque patient-facing identifier; never expose Mongo or account ids to clients. */
  @Prop({ unique: true, sparse: true, index: true }) health_id?: string;
  @Prop({ default: [] }) device_tokens: string[]; // Native push tokens (FCM/APNs/Expo)
  @Prop() last_login_at?: Date;
  // --- staff / sub-user fields (hospital/clinic) ---
  @Prop({ type: String, ref: 'ProviderProfile', default: null, index: true })
  parent_provider_account_id?: string;
  @Prop({ type: String, ref: 'ProviderBranch', default: null, index: true })
  assigned_branch_id?: string;
  @Prop() department?: string;
  @Prop({ type: [String], default: [] }) permissions?: string[];
  @Prop({ type: Object }) schedule?: any;
  @Prop({ default: false }) suspended?: boolean;
  @Prop({ default: false }) verified?: boolean;
  // Doctor-specific (when role=DOCTOR under a hospital/clinic)
  @Prop() specialty?: string;
  @Prop() degree?: string;
  @Prop() years_experience?: number;
  @Prop() license_number?: string;
  @Prop({ default: 0 }) consultation_fee?: number;
}
export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
