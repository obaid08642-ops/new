"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceDetailsSchema = exports.InsuranceDetails = exports.InsuranceClaimSchema = exports.InsuranceClaim = exports.CoverageRuleSchema = exports.CoverageRule = exports.InsuranceNetworkSchema = exports.InsuranceNetwork = exports.InsuranceCompanySchema = exports.InsuranceCompany = exports.InsuranceNetworkContractSchema = exports.InsuranceNetworkContract = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let InsuranceNetworkContract = class InsuranceNetworkContract {
};
exports.InsuranceNetworkContract = InsuranceNetworkContract;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], InsuranceNetworkContract.prototype, "company_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceNetworkContract.prototype, "company_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceNetworkContract.prototype, "company_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], InsuranceNetworkContract.prototype, "network_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceNetworkContract.prototype, "network_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceNetworkContract.prototype, "network_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], InsuranceNetworkContract.prototype, "covered_classes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], InsuranceNetworkContract.prototype, "copay_percent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], InsuranceNetworkContract.prototype, "copay_flat", void 0);
exports.InsuranceNetworkContract = InsuranceNetworkContract = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], InsuranceNetworkContract);
exports.InsuranceNetworkContractSchema = mongoose_1.SchemaFactory.createForClass(InsuranceNetworkContract);
let InsuranceCompany = class InsuranceCompany {
};
exports.InsuranceCompany = InsuranceCompany;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "logo_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "logo_source_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "logo_sha256", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], InsuranceCompany.prototype, "logo_verified_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "regulatory_source_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['insurer', 'foreign_branch', 'reinsurer', 'insurance_service_provider'], default: 'insurer' }),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending_review', 'verified', 'retired'], default: 'pending_review', index: true }),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "catalog_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "provenance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], InsuranceCompany.prototype, "catalog_version", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceCompany.prototype, "superseded_by_company_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], InsuranceCompany.prototype, "retired_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], InsuranceCompany.prototype, "is_active", void 0);
exports.InsuranceCompany = InsuranceCompany = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'insurance_companies' })
], InsuranceCompany);
exports.InsuranceCompanySchema = mongoose_1.SchemaFactory.createForClass(InsuranceCompany);
let InsuranceNetwork = class InsuranceNetwork {
};
exports.InsuranceNetwork = InsuranceNetwork;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "company_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], InsuranceNetwork.prototype, "tier_level", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "source_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "source_label", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], InsuranceNetwork.prototype, "verified_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending_review', 'verified', 'retired'], default: 'pending_review', index: true }),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "catalog_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceNetwork.prototype, "provenance", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], InsuranceNetwork.prototype, "retired_at", void 0);
exports.InsuranceNetwork = InsuranceNetwork = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'insurance_networks' })
], InsuranceNetwork);
exports.InsuranceNetworkSchema = mongoose_1.SchemaFactory.createForClass(InsuranceNetwork);
let CoverageRule = class CoverageRule {
};
exports.CoverageRule = CoverageRule;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], CoverageRule.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CoverageRule.prototype, "network_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CoverageRule.prototype, "service_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CoverageRule.prototype, "service_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], CoverageRule.prototype, "copay_percent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], CoverageRule.prototype, "copay_flat_limit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CoverageRule.prototype, "requires_preauth", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], CoverageRule.prototype, "max_annual_limit", void 0);
exports.CoverageRule = CoverageRule = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'insurance_coverage_rules' })
], CoverageRule);
exports.CoverageRuleSchema = mongoose_1.SchemaFactory.createForClass(CoverageRule);
let InsuranceClaim = class InsuranceClaim {
};
exports.InsuranceClaim = InsuranceClaim;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], InsuranceClaim.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], InsuranceClaim.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], InsuranceClaim.prototype, "service", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InsuranceClaim.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InsuranceClaim.prototype, "covered", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['approved', 'reimbursed', 'pending', 'rejected'], default: 'pending' }),
    __metadata("design:type", String)
], InsuranceClaim.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceClaim.prototype, "date", void 0);
exports.InsuranceClaim = InsuranceClaim = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'insurance_claims' })
], InsuranceClaim);
exports.InsuranceClaimSchema = mongoose_1.SchemaFactory.createForClass(InsuranceClaim);
let InsuranceDetails = class InsuranceDetails {
};
exports.InsuranceDetails = InsuranceDetails;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceDetails.prototype, "policyNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceDetails.prototype, "memberId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceDetails.prototype, "approvalReferenceNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['PENDING_PROVIDER_REVIEW', 'SUBMITTED_TO_INSURANCE', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'], default: 'PENDING_PROVIDER_REVIEW', index: true }),
    __metadata("design:type", String)
], InsuranceDetails.prototype, "approvalStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], InsuranceDetails.prototype, "approvalDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceDetails.prototype, "approvedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InsuranceDetails.prototype, "coveredAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InsuranceDetails.prototype, "copayAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InsuranceDetails.prototype, "coveragePercentage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InsuranceDetails.prototype, "patientCopayPercentage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InsuranceDetails.prototype, "insuranceCompanyShare", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InsuranceDetails.prototype, "patientShare", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], InsuranceDetails.prototype, "rejectionReason", void 0);
exports.InsuranceDetails = InsuranceDetails = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], InsuranceDetails);
exports.InsuranceDetailsSchema = mongoose_1.SchemaFactory.createForClass(InsuranceDetails);
//# sourceMappingURL=insurance.schema.js.map