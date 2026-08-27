import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { OperatorPermission, OperatorRole, ProviderAccountStatus, ProviderDocumentType, ProviderType } from '../provider.enums';

// ===================== ACCOUNT =====================
@Schema({ timestamps: true, collection: 'provider_accounts' })
export class ProviderAccount extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) email: string;
  @Prop({ unique: true, sparse: true, index: true }) phone_e164?: string;
  @Prop({ required: true }) password_hash: string;
  @Prop({ required: true, enum: Object.values(ProviderType), index: true }) provider_type: ProviderType;
  @Prop({ default: ProviderAccountStatus.EMAIL_UNVERIFIED, enum: Object.values(ProviderAccountStatus), index: true }) status: ProviderAccountStatus;
  @Prop({ default: false }) email_verified: boolean;
  @Prop() email_verified_at?: Date;
  @Prop({ default: 0 }) failed_login_attempts: number;
  @Prop() locked_until?: Date;
  @Prop() last_login_at?: Date;
  @Prop() approved_at?: Date;
  @Prop() approved_by?: string;
  @Prop() rejection_reason?: string;
  @Prop({ default: [] }) status_history: any[];
  @Prop({ type: Object, default: {} }) onboarding_progress: any;
}
export const ProviderAccountSchema = SchemaFactory.createForClass(ProviderAccount);
ProviderAccountSchema.index({ status: 1, createdAt: -1 });

// ===================== SESSION =====================
@Schema({ timestamps: true, collection: 'provider_sessions' })
export class ProviderSession extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true }) device_identifier: string;
  @Prop({ required: true }) refresh_token_hash: string;
  @Prop({ required: true, enum: ['active', 'revoked'], default: 'active' }) status: string;
  @Prop({ required: true }) expires_at: Date;
}
export const ProviderSessionSchema = SchemaFactory.createForClass(ProviderSession);
ProviderSessionSchema.index({ provider_account_id: 1, status: 1 });

// ===================== PROFILE =====================
@Schema({ timestamps: true, collection: 'provider_profiles' })
export class ProviderProfile extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true, index: true }) account_id: string;
  @Prop({ required: true, enum: Object.values(ProviderType) }) provider_type: ProviderType;
  @Prop() display_name_ar?: string;
  @Prop() display_name_en?: string;
  @Prop() business_name?: string;
  @Prop() legal_name?: string;
  @Prop() description_ar?: string;
  @Prop() description_en?: string;
  @Prop() profile_image_id?: string;
  @Prop() cover_image_id?: string;
  @Prop() commercial_registration_number?: string;
  @Prop() tax_number?: string;
  @Prop() medical_license_number?: string;
  @Prop() facility_license_number?: string;
  @Prop() established_year?: number;
  @Prop() years_of_experience?: number;
  // phones: [{id,type,country_code,number,is_primary,verified}]
  @Prop({ type: [Object], default: [] }) phones: any[];
  @Prop() website?: string;
  @Prop({ type: Object }) social?: any;
  @Prop({ type: Object }) address?: any; // {country,city,district,street,building_number,postal_code,landmark}
  @Prop({ type: Object }) geo?: any; // {lat,lng,formatted_address,service_radius_km,service_polygon[]}
  @Prop({ default: false }) has_own_delivery: boolean;
  @Prop({ default: true }) use_platform_delivery: boolean;
  @Prop() delivery_fee?: number;
  @Prop() estimated_delivery_minutes?: number;
  @Prop({ default: [], type: [String] }) enabled_modules: string[];
  @Prop({ default: 10 }) commission_rate?: number;
  @Prop({ default: 0 }) profile_completeness: number;
}
export const ProviderProfileSchema = SchemaFactory.createForClass(ProviderProfile);

// ===================== DOCUMENT =====================
export enum DocumentReviewStatus { PENDING = 'pending', UNDER_REVIEW = 'under_review', APPROVED = 'approved', REJECTED = 'rejected', NEEDS_REPLACEMENT = 'needs_replacement' }
@Schema({ timestamps: true, collection: 'provider_documents' })
export class ProviderDocument extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) account_id: string;
  @Prop({ required: true, enum: Object.values(ProviderDocumentType) }) doc_type: ProviderDocumentType;
  @Prop({ required: true }) storage_object_id: string;
  @Prop() doc_number?: string;
  @Prop() issuer?: string;
  @Prop() issued_date?: Date;
  @Prop() expiry_date?: Date;
  @Prop({ default: DocumentReviewStatus.PENDING, enum: Object.values(DocumentReviewStatus) }) review_status: DocumentReviewStatus;
  @Prop() reviewer_id?: string;
  @Prop() reviewer_note?: string;
  @Prop() reviewed_at?: Date;
}
export const ProviderDocumentSchema = SchemaFactory.createForClass(ProviderDocument);
ProviderDocumentSchema.index({ account_id: 1, doc_type: 1 });

// ===================== BANK =====================
export const SAUDI_BANKS = [
  { code: 'rajhi', name_ar: 'مصرف الراجحي', name_en: 'Al Rajhi Bank' },
  { code: 'snb', name_ar: 'البنك الأهلي السعودي', name_en: 'Saudi National Bank (SNB)' },
  { code: 'riyad', name_ar: 'بنك الرياض', name_en: 'Riyad Bank' },
  { code: 'sab', name_ar: 'البنك السعودي البريطاني', name_en: 'SAB (Saudi Awwal Bank)' },
  { code: 'alinma', name_ar: 'مصرف الإنماء', name_en: 'Alinma Bank' },
  { code: 'bsf', name_ar: 'البنك السعودي الفرنسي', name_en: 'Banque Saudi Fransi (BSF)' },
  { code: 'jazira', name_ar: 'بنك الجزيرة', name_en: 'Bank AlJazira' },
  { code: 'anb', name_ar: 'البنك العربي الوطني', name_en: 'Arab National Bank (ANB)' },
  { code: 'albilad', name_ar: 'بنك البلاد', name_en: 'Bank AlBilad' },
  { code: 'emiratesnbd', name_ar: 'بنك الإمارات دبي الوطني', name_en: 'Emirates NBD' },
  { code: 'gib', name_ar: 'بنك الخليج الدولي', name_en: 'Gulf International Bank' },
  { code: 'nbk', name_ar: 'بنك الكويت الوطني', name_en: 'NBK' },
  { code: 'other', name_ar: 'بنك آخر', name_en: 'Other' },
] as const;
export enum BankReviewStatus { PENDING = 'pending', UNDER_REVIEW = 'under_review', APPROVED = 'approved', REJECTED = 'rejected' }
@Schema({ timestamps: true, collection: 'provider_bank_accounts' })
export class ProviderBankAccount extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true, index: true }) account_id: string;
  @Prop({ required: true }) bank_code: string;
  @Prop({ required: true }) bank_name: string;
  @Prop({ required: true }) holder_name: string;
  @Prop({ required: true, uppercase: true }) iban: string;
  @Prop() vat_number?: string;
  @Prop() iban_letter_storage_id?: string;
  @Prop({ default: BankReviewStatus.PENDING, enum: Object.values(BankReviewStatus) }) review_status: BankReviewStatus;
  @Prop() reviewer_id?: string;
  @Prop() reviewer_note?: string;
}
export const ProviderBankAccountSchema = SchemaFactory.createForClass(ProviderBankAccount);

// ===================== OPERATOR =====================
export enum OperatorStatus { INVITED = 'invited', ACTIVE = 'active', DISABLED = 'disabled', REVOKED = 'revoked' }
@Schema({ timestamps: true, collection: 'provider_operators' })
export class ProviderOperator extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_account_id: string;
  @Prop({ required: true, lowercase: true, trim: true }) email: string;
  @Prop() phone?: string;
  @Prop() full_name?: string;
  @Prop({ required: true, enum: Object.values(OperatorRole) }) role: OperatorRole;
  @Prop({ default: [], type: [String] }) permissions: OperatorPermission[];
  @Prop({ default: OperatorStatus.INVITED, enum: Object.values(OperatorStatus) }) status: OperatorStatus;
  @Prop() password_hash?: string;
  @Prop() invite_token?: string;
  @Prop() invite_token_expires_at?: Date;
  @Prop() accepted_at?: Date;
  @Prop() last_login_at?: Date;
  @Prop() disabled_at?: Date;
  @Prop() disabled_by?: string;
  @Prop() disabled_reason?: string;
}
export const ProviderOperatorSchema = SchemaFactory.createForClass(ProviderOperator);
ProviderOperatorSchema.index({ provider_account_id: 1, email: 1 }, { unique: true });

// ===================== OTP =====================
export enum OtpPurpose { EMAIL_VERIFICATION = 'email_verification', PASSWORD_RESET = 'password_reset', OPERATOR_INVITE = 'operator_invite', LOGIN_2FA = 'login_2fa' }
export enum OtpStatus { ACTIVE = 'active', USED = 'used', EXPIRED = 'expired', INVALIDATED = 'invalidated' }
@Schema({ timestamps: true, collection: 'provider_otp_codes' })
export class ProviderOtpCode extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, lowercase: true, trim: true, index: true }) email: string;
  @Prop({ required: true, enum: Object.values(OtpPurpose), index: true }) purpose: OtpPurpose;
  @Prop({ required: true }) code_hash: string;
  @Prop({ default: OtpStatus.ACTIVE, enum: Object.values(OtpStatus), index: true }) status: OtpStatus;
  @Prop({ default: 0 }) attempts: number;
  @Prop({ required: true }) expires_at: Date;
  @Prop() consumed_at?: Date;
  @Prop() last_sent_at?: Date;
  @Prop() ip?: string;
  @Prop() user_agent?: string;
}
export const ProviderOtpCodeSchema = SchemaFactory.createForClass(ProviderOtpCode);
export * from './capabilities.schema';
export * from './requests.schema';
ProviderOtpCodeSchema.index({ email: 1, purpose: 1, status: 1 });

// ===================== AUDIT =====================
@Schema({ timestamps: true, collection: 'provider_audit_logs' })
export class ProviderAuditLog extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ index: true }) provider_account_id?: string;
  @Prop({ required: true }) actor_id: string;
  @Prop({ required: true }) actor_role: string;
  @Prop({ required: true, index: true }) action: string;
  @Prop({ type: Object }) target?: any;
  @Prop({ type: Object }) before?: any;
  @Prop({ type: Object }) after?: any;
  @Prop({ type: Object }) meta?: any;
  @Prop() ip?: string;
  @Prop() user_agent?: string;
}
export const ProviderAuditLogSchema = SchemaFactory.createForClass(ProviderAuditLog);
ProviderAuditLogSchema.index({ provider_account_id: 1, createdAt: -1 });

// ===================== DELTA / SETTINGS GUARD =====================
export enum DeltaStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected' }
@Schema({ timestamps: true, collection: 'provider_deltas' })
export class ProviderDelta extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) provider_id: string;
  @Prop({ type: Object, required: true }) requested_changes: any; // { clinic_price, online_price, home_price, home_radius_km, accepted_insurances }
  @Prop({ default: DeltaStatus.PENDING, enum: Object.values(DeltaStatus) }) status: DeltaStatus;
  @Prop() reviewer_id?: string;
  @Prop() review_note?: string;
  @Prop() reviewed_at?: Date;
}
export const ProviderDeltaSchema = SchemaFactory.createForClass(ProviderDelta);
ProviderDeltaSchema.index({ provider_id: 1, status: 1 });
