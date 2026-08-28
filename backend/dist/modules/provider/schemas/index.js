"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderDeltaSchema = exports.ProviderDelta = exports.DeltaStatus = exports.ProviderAuditLogSchema = exports.ProviderAuditLog = exports.ProviderOtpCodeSchema = exports.ProviderOtpCode = exports.OtpStatus = exports.OtpPurpose = exports.ProviderOperatorSchema = exports.ProviderOperator = exports.OperatorStatus = exports.ProviderBankAccountSchema = exports.ProviderBankAccount = exports.BankReviewStatus = exports.SAUDI_BANKS = exports.ProviderDocumentSchema = exports.ProviderDocument = exports.DocumentReviewStatus = exports.ProviderProfileSchema = exports.ProviderProfile = exports.ProviderSessionSchema = exports.ProviderSession = exports.ProviderAccountSchema = exports.ProviderAccount = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const provider_enums_1 = require("../provider.enums");
let ProviderAccount = class ProviderAccount extends mongoose_2.Document {
};
exports.ProviderAccount = ProviderAccount;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderAccount.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], ProviderAccount.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], ProviderAccount.prototype, "phone_e164", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderAccount.prototype, "password_hash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(provider_enums_1.ProviderType), index: true }),
    __metadata("design:type", String)
], ProviderAccount.prototype, "provider_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: provider_enums_1.ProviderAccountStatus.EMAIL_UNVERIFIED, enum: Object.values(provider_enums_1.ProviderAccountStatus), index: true }),
    __metadata("design:type", String)
], ProviderAccount.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderAccount.prototype, "email_verified", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderAccount.prototype, "email_verified_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderAccount.prototype, "failed_login_attempts", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderAccount.prototype, "locked_until", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderAccount.prototype, "last_login_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderAccount.prototype, "approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderAccount.prototype, "approved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderAccount.prototype, "rejection_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderAccount.prototype, "status_history", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], ProviderAccount.prototype, "onboarding_progress", void 0);
exports.ProviderAccount = ProviderAccount = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_accounts' })
], ProviderAccount);
exports.ProviderAccountSchema = mongoose_1.SchemaFactory.createForClass(ProviderAccount);
exports.ProviderAccountSchema.index({ status: 1, createdAt: -1 });
let ProviderSession = class ProviderSession extends mongoose_2.Document {
};
exports.ProviderSession = ProviderSession;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderSession.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderSession.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderSession.prototype, "device_identifier", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderSession.prototype, "refresh_token_hash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'revoked'], default: 'active' }),
    __metadata("design:type", String)
], ProviderSession.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], ProviderSession.prototype, "expires_at", void 0);
exports.ProviderSession = ProviderSession = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_sessions' })
], ProviderSession);
exports.ProviderSessionSchema = mongoose_1.SchemaFactory.createForClass(ProviderSession);
exports.ProviderSessionSchema.index({ provider_account_id: 1, status: 1 });
let ProviderProfile = class ProviderProfile extends mongoose_2.Document {
};
exports.ProviderProfile = ProviderProfile;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(provider_enums_1.ProviderType) }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "provider_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "display_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "display_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "business_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "legal_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "profile_image_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "cover_image_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "commercial_registration_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "tax_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "medical_license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "facility_license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "established_year", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "years_of_experience", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "phones", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "website", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderProfile.prototype, "social", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderProfile.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderProfile.prototype, "geo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "has_own_delivery", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "use_platform_delivery", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "delivery_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "estimated_delivery_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [], type: [String] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "enabled_modules", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 10 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "commission_rate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "profile_completeness", void 0);
exports.ProviderProfile = ProviderProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_profiles' })
], ProviderProfile);
exports.ProviderProfileSchema = mongoose_1.SchemaFactory.createForClass(ProviderProfile);
var DocumentReviewStatus;
(function (DocumentReviewStatus) {
    DocumentReviewStatus["PENDING"] = "pending";
    DocumentReviewStatus["UNDER_REVIEW"] = "under_review";
    DocumentReviewStatus["APPROVED"] = "approved";
    DocumentReviewStatus["REJECTED"] = "rejected";
    DocumentReviewStatus["NEEDS_REPLACEMENT"] = "needs_replacement";
})(DocumentReviewStatus || (exports.DocumentReviewStatus = DocumentReviewStatus = {}));
let ProviderDocument = class ProviderDocument extends mongoose_2.Document {
};
exports.ProviderDocument = ProviderDocument;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderDocument.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderDocument.prototype, "account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(provider_enums_1.ProviderDocumentType) }),
    __metadata("design:type", String)
], ProviderDocument.prototype, "doc_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderDocument.prototype, "storage_object_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDocument.prototype, "doc_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDocument.prototype, "issuer", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderDocument.prototype, "issued_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderDocument.prototype, "expiry_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: DocumentReviewStatus.PENDING, enum: Object.values(DocumentReviewStatus) }),
    __metadata("design:type", String)
], ProviderDocument.prototype, "review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDocument.prototype, "reviewer_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDocument.prototype, "reviewer_note", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderDocument.prototype, "reviewed_at", void 0);
exports.ProviderDocument = ProviderDocument = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_documents' })
], ProviderDocument);
exports.ProviderDocumentSchema = mongoose_1.SchemaFactory.createForClass(ProviderDocument);
exports.ProviderDocumentSchema.index({ account_id: 1, doc_type: 1 });
exports.SAUDI_BANKS = [
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
];
var BankReviewStatus;
(function (BankReviewStatus) {
    BankReviewStatus["PENDING"] = "pending";
    BankReviewStatus["UNDER_REVIEW"] = "under_review";
    BankReviewStatus["APPROVED"] = "approved";
    BankReviewStatus["REJECTED"] = "rejected";
})(BankReviewStatus || (exports.BankReviewStatus = BankReviewStatus = {}));
let ProviderBankAccount = class ProviderBankAccount extends mongoose_2.Document {
};
exports.ProviderBankAccount = ProviderBankAccount;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "bank_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "bank_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "holder_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, uppercase: true }),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "iban", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "vat_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "iban_letter_storage_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: BankReviewStatus.PENDING, enum: Object.values(BankReviewStatus) }),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "reviewer_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderBankAccount.prototype, "reviewer_note", void 0);
exports.ProviderBankAccount = ProviderBankAccount = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_bank_accounts' })
], ProviderBankAccount);
exports.ProviderBankAccountSchema = mongoose_1.SchemaFactory.createForClass(ProviderBankAccount);
var OperatorStatus;
(function (OperatorStatus) {
    OperatorStatus["INVITED"] = "invited";
    OperatorStatus["ACTIVE"] = "active";
    OperatorStatus["DISABLED"] = "disabled";
    OperatorStatus["REVOKED"] = "revoked";
})(OperatorStatus || (exports.OperatorStatus = OperatorStatus = {}));
let ProviderOperator = class ProviderOperator extends mongoose_2.Document {
};
exports.ProviderOperator = ProviderOperator;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderOperator.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderOperator.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], ProviderOperator.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOperator.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOperator.prototype, "full_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(provider_enums_1.OperatorRole) }),
    __metadata("design:type", String)
], ProviderOperator.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [], type: [String] }),
    __metadata("design:type", Array)
], ProviderOperator.prototype, "permissions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: OperatorStatus.INVITED, enum: Object.values(OperatorStatus) }),
    __metadata("design:type", String)
], ProviderOperator.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOperator.prototype, "password_hash", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOperator.prototype, "invite_token", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderOperator.prototype, "invite_token_expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderOperator.prototype, "accepted_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderOperator.prototype, "last_login_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderOperator.prototype, "disabled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOperator.prototype, "disabled_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOperator.prototype, "disabled_reason", void 0);
exports.ProviderOperator = ProviderOperator = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_operators' })
], ProviderOperator);
exports.ProviderOperatorSchema = mongoose_1.SchemaFactory.createForClass(ProviderOperator);
exports.ProviderOperatorSchema.index({ provider_account_id: 1, email: 1 }, { unique: true });
var OtpPurpose;
(function (OtpPurpose) {
    OtpPurpose["EMAIL_VERIFICATION"] = "email_verification";
    OtpPurpose["PASSWORD_RESET"] = "password_reset";
    OtpPurpose["OPERATOR_INVITE"] = "operator_invite";
    OtpPurpose["LOGIN_2FA"] = "login_2fa";
})(OtpPurpose || (exports.OtpPurpose = OtpPurpose = {}));
var OtpStatus;
(function (OtpStatus) {
    OtpStatus["ACTIVE"] = "active";
    OtpStatus["USED"] = "used";
    OtpStatus["EXPIRED"] = "expired";
    OtpStatus["INVALIDATED"] = "invalidated";
})(OtpStatus || (exports.OtpStatus = OtpStatus = {}));
let ProviderOtpCode = class ProviderOtpCode extends mongoose_2.Document {
};
exports.ProviderOtpCode = ProviderOtpCode;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderOtpCode.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, index: true }),
    __metadata("design:type", String)
], ProviderOtpCode.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(OtpPurpose), index: true }),
    __metadata("design:type", String)
], ProviderOtpCode.prototype, "purpose", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderOtpCode.prototype, "code_hash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: OtpStatus.ACTIVE, enum: Object.values(OtpStatus), index: true }),
    __metadata("design:type", String)
], ProviderOtpCode.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderOtpCode.prototype, "attempts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], ProviderOtpCode.prototype, "expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderOtpCode.prototype, "consumed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderOtpCode.prototype, "last_sent_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOtpCode.prototype, "ip", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderOtpCode.prototype, "user_agent", void 0);
exports.ProviderOtpCode = ProviderOtpCode = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_otp_codes' })
], ProviderOtpCode);
exports.ProviderOtpCodeSchema = mongoose_1.SchemaFactory.createForClass(ProviderOtpCode);
__exportStar(require("./capabilities.schema"), exports);
__exportStar(require("./requests.schema"), exports);
exports.ProviderOtpCodeSchema.index({ email: 1, purpose: 1, status: 1 });
let ProviderAuditLog = class ProviderAuditLog extends mongoose_2.Document {
};
exports.ProviderAuditLog = ProviderAuditLog;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderAuditLog.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], ProviderAuditLog.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderAuditLog.prototype, "actor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderAuditLog.prototype, "actor_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderAuditLog.prototype, "action", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderAuditLog.prototype, "target", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderAuditLog.prototype, "before", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderAuditLog.prototype, "after", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderAuditLog.prototype, "meta", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderAuditLog.prototype, "ip", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderAuditLog.prototype, "user_agent", void 0);
exports.ProviderAuditLog = ProviderAuditLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_audit_logs' })
], ProviderAuditLog);
exports.ProviderAuditLogSchema = mongoose_1.SchemaFactory.createForClass(ProviderAuditLog);
exports.ProviderAuditLogSchema.index({ provider_account_id: 1, createdAt: -1 });
var DeltaStatus;
(function (DeltaStatus) {
    DeltaStatus["PENDING"] = "pending";
    DeltaStatus["APPROVED"] = "approved";
    DeltaStatus["REJECTED"] = "rejected";
})(DeltaStatus || (exports.DeltaStatus = DeltaStatus = {}));
let ProviderDelta = class ProviderDelta extends mongoose_2.Document {
};
exports.ProviderDelta = ProviderDelta;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderDelta.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderDelta.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], ProviderDelta.prototype, "requested_changes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: DeltaStatus.PENDING, enum: Object.values(DeltaStatus) }),
    __metadata("design:type", String)
], ProviderDelta.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDelta.prototype, "reviewer_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDelta.prototype, "review_note", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderDelta.prototype, "reviewed_at", void 0);
exports.ProviderDelta = ProviderDelta = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_deltas' })
], ProviderDelta);
exports.ProviderDeltaSchema = mongoose_1.SchemaFactory.createForClass(ProviderDelta);
exports.ProviderDeltaSchema.index({ provider_id: 1, status: 1 });
//# sourceMappingURL=index.js.map