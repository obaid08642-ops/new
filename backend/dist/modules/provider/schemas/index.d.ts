import { Document } from 'mongoose';
import { OperatorPermission, OperatorRole, ProviderAccountStatus, ProviderDocumentType, ProviderType } from '../provider.enums';
export declare class ProviderAccount extends Document {
    id: string;
    email: string;
    phone_e164?: string;
    password_hash: string;
    provider_type: ProviderType;
    status: ProviderAccountStatus;
    email_verified: boolean;
    email_verified_at?: Date;
    failed_login_attempts: number;
    locked_until?: Date;
    last_login_at?: Date;
    approved_at?: Date;
    approved_by?: string;
    rejection_reason?: string;
    status_history: any[];
    onboarding_progress: any;
}
export declare const ProviderAccountSchema: import("mongoose").Schema<ProviderAccount, import("mongoose").Model<ProviderAccount, any, any, any, Document<unknown, any, ProviderAccount, any, {}> & ProviderAccount & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderAccount, Document<unknown, {}, import("mongoose").FlatRecord<ProviderAccount>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderAccount> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ProviderSession extends Document {
    id: string;
    provider_account_id: string;
    device_identifier: string;
    refresh_token_hash: string;
    status: string;
    expires_at: Date;
}
export declare const ProviderSessionSchema: import("mongoose").Schema<ProviderSession, import("mongoose").Model<ProviderSession, any, any, any, Document<unknown, any, ProviderSession, any, {}> & ProviderSession & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderSession, Document<unknown, {}, import("mongoose").FlatRecord<ProviderSession>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderSession> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ProviderProfile extends Document {
    id: string;
    account_id: string;
    provider_type: ProviderType;
    display_name_ar?: string;
    display_name_en?: string;
    business_name?: string;
    legal_name?: string;
    description_ar?: string;
    description_en?: string;
    profile_image_id?: string;
    cover_image_id?: string;
    commercial_registration_number?: string;
    tax_number?: string;
    medical_license_number?: string;
    facility_license_number?: string;
    established_year?: number;
    years_of_experience?: number;
    phones: any[];
    website?: string;
    social?: any;
    address?: any;
    geo?: any;
    has_own_delivery: boolean;
    use_platform_delivery: boolean;
    delivery_fee?: number;
    estimated_delivery_minutes?: number;
    enabled_modules: string[];
    commission_rate?: number;
    profile_completeness: number;
}
export declare const ProviderProfileSchema: import("mongoose").Schema<ProviderProfile, import("mongoose").Model<ProviderProfile, any, any, any, Document<unknown, any, ProviderProfile, any, {}> & ProviderProfile & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderProfile, Document<unknown, {}, import("mongoose").FlatRecord<ProviderProfile>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderProfile> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum DocumentReviewStatus {
    PENDING = "pending",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    NEEDS_REPLACEMENT = "needs_replacement"
}
export declare class ProviderDocument extends Document {
    id: string;
    account_id: string;
    doc_type: ProviderDocumentType;
    storage_object_id: string;
    doc_number?: string;
    issuer?: string;
    issued_date?: Date;
    expiry_date?: Date;
    review_status: DocumentReviewStatus;
    reviewer_id?: string;
    reviewer_note?: string;
    reviewed_at?: Date;
}
export declare const ProviderDocumentSchema: import("mongoose").Schema<ProviderDocument, import("mongoose").Model<ProviderDocument, any, any, any, Document<unknown, any, ProviderDocument, any, {}> & ProviderDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderDocument, Document<unknown, {}, import("mongoose").FlatRecord<ProviderDocument>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderDocument> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const SAUDI_BANKS: readonly [{
    readonly code: "rajhi";
    readonly name_ar: "مصرف الراجحي";
    readonly name_en: "Al Rajhi Bank";
}, {
    readonly code: "snb";
    readonly name_ar: "البنك الأهلي السعودي";
    readonly name_en: "Saudi National Bank (SNB)";
}, {
    readonly code: "riyad";
    readonly name_ar: "بنك الرياض";
    readonly name_en: "Riyad Bank";
}, {
    readonly code: "sab";
    readonly name_ar: "البنك السعودي البريطاني";
    readonly name_en: "SAB (Saudi Awwal Bank)";
}, {
    readonly code: "alinma";
    readonly name_ar: "مصرف الإنماء";
    readonly name_en: "Alinma Bank";
}, {
    readonly code: "bsf";
    readonly name_ar: "البنك السعودي الفرنسي";
    readonly name_en: "Banque Saudi Fransi (BSF)";
}, {
    readonly code: "jazira";
    readonly name_ar: "بنك الجزيرة";
    readonly name_en: "Bank AlJazira";
}, {
    readonly code: "anb";
    readonly name_ar: "البنك العربي الوطني";
    readonly name_en: "Arab National Bank (ANB)";
}, {
    readonly code: "albilad";
    readonly name_ar: "بنك البلاد";
    readonly name_en: "Bank AlBilad";
}, {
    readonly code: "emiratesnbd";
    readonly name_ar: "بنك الإمارات دبي الوطني";
    readonly name_en: "Emirates NBD";
}, {
    readonly code: "gib";
    readonly name_ar: "بنك الخليج الدولي";
    readonly name_en: "Gulf International Bank";
}, {
    readonly code: "nbk";
    readonly name_ar: "بنك الكويت الوطني";
    readonly name_en: "NBK";
}, {
    readonly code: "other";
    readonly name_ar: "بنك آخر";
    readonly name_en: "Other";
}];
export declare enum BankReviewStatus {
    PENDING = "pending",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class ProviderBankAccount extends Document {
    id: string;
    account_id: string;
    bank_code: string;
    bank_name: string;
    holder_name: string;
    iban: string;
    vat_number?: string;
    iban_letter_storage_id?: string;
    review_status: BankReviewStatus;
    reviewer_id?: string;
    reviewer_note?: string;
}
export declare const ProviderBankAccountSchema: import("mongoose").Schema<ProviderBankAccount, import("mongoose").Model<ProviderBankAccount, any, any, any, Document<unknown, any, ProviderBankAccount, any, {}> & ProviderBankAccount & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderBankAccount, Document<unknown, {}, import("mongoose").FlatRecord<ProviderBankAccount>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderBankAccount> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum OperatorStatus {
    INVITED = "invited",
    ACTIVE = "active",
    DISABLED = "disabled",
    REVOKED = "revoked"
}
export declare class ProviderOperator extends Document {
    id: string;
    provider_account_id: string;
    email: string;
    phone?: string;
    full_name?: string;
    role: OperatorRole;
    permissions: OperatorPermission[];
    status: OperatorStatus;
    password_hash?: string;
    invite_token?: string;
    invite_token_expires_at?: Date;
    accepted_at?: Date;
    last_login_at?: Date;
    disabled_at?: Date;
    disabled_by?: string;
    disabled_reason?: string;
}
export declare const ProviderOperatorSchema: import("mongoose").Schema<ProviderOperator, import("mongoose").Model<ProviderOperator, any, any, any, Document<unknown, any, ProviderOperator, any, {}> & ProviderOperator & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderOperator, Document<unknown, {}, import("mongoose").FlatRecord<ProviderOperator>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderOperator> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum OtpPurpose {
    EMAIL_VERIFICATION = "email_verification",
    PASSWORD_RESET = "password_reset",
    OPERATOR_INVITE = "operator_invite",
    LOGIN_2FA = "login_2fa"
}
export declare enum OtpStatus {
    ACTIVE = "active",
    USED = "used",
    EXPIRED = "expired",
    INVALIDATED = "invalidated"
}
export declare class ProviderOtpCode extends Document {
    id: string;
    email: string;
    purpose: OtpPurpose;
    code_hash: string;
    status: OtpStatus;
    attempts: number;
    expires_at: Date;
    consumed_at?: Date;
    last_sent_at?: Date;
    ip?: string;
    user_agent?: string;
}
export declare const ProviderOtpCodeSchema: import("mongoose").Schema<ProviderOtpCode, import("mongoose").Model<ProviderOtpCode, any, any, any, Document<unknown, any, ProviderOtpCode, any, {}> & ProviderOtpCode & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderOtpCode, Document<unknown, {}, import("mongoose").FlatRecord<ProviderOtpCode>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderOtpCode> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export * from './capabilities.schema';
export * from './requests.schema';
export declare class ProviderAuditLog extends Document {
    id: string;
    provider_account_id?: string;
    actor_id: string;
    actor_role: string;
    action: string;
    target?: any;
    before?: any;
    after?: any;
    meta?: any;
    ip?: string;
    user_agent?: string;
}
export declare const ProviderAuditLogSchema: import("mongoose").Schema<ProviderAuditLog, import("mongoose").Model<ProviderAuditLog, any, any, any, Document<unknown, any, ProviderAuditLog, any, {}> & ProviderAuditLog & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderAuditLog, Document<unknown, {}, import("mongoose").FlatRecord<ProviderAuditLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderAuditLog> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum DeltaStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class ProviderDelta extends Document {
    id: string;
    provider_id: string;
    requested_changes: any;
    status: DeltaStatus;
    reviewer_id?: string;
    review_note?: string;
    reviewed_at?: Date;
}
export declare const ProviderDeltaSchema: import("mongoose").Schema<ProviderDelta, import("mongoose").Model<ProviderDelta, any, any, any, Document<unknown, any, ProviderDelta, any, {}> & ProviderDelta & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderDelta, Document<unknown, {}, import("mongoose").FlatRecord<ProviderDelta>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderDelta> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
