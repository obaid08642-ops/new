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
exports.JobApplicationSchema = exports.JobApplication = exports.JobPostingSchema = exports.JobPosting = exports.CandidateProfileSchema = exports.CandidateProfile = exports.CandidateExperienceSchema = exports.CandidateExperience = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let CandidateExperience = class CandidateExperience {
};
exports.CandidateExperience = CandidateExperience;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CandidateExperience.prototype, "company", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CandidateExperience.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CandidateExperience.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CandidateExperience.prototype, "description", void 0);
exports.CandidateExperience = CandidateExperience = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], CandidateExperience);
exports.CandidateExperienceSchema = mongoose_1.SchemaFactory.createForClass(CandidateExperience);
let CandidateProfile = class CandidateProfile {
};
exports.CandidateProfile = CandidateProfile;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "cv_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.CandidateExperienceSchema], default: [] }),
    __metadata("design:type", Array)
], CandidateProfile.prototype, "experiences", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "scfhs_license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CandidateProfile.prototype, "scfhs_license_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], CandidateProfile.prototype, "scfhs_license_expiry", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], CandidateProfile.prototype, "skills", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CandidateProfile.prototype, "is_deleted", void 0);
exports.CandidateProfile = CandidateProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'candidate_profiles' })
], CandidateProfile);
exports.CandidateProfileSchema = mongoose_1.SchemaFactory.createForClass(CandidateProfile);
let JobPosting = class JobPosting {
};
exports.JobPosting = JobPosting;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], JobPosting.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], JobPosting.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], JobPosting.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], JobPosting.prototype, "requirements", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], JobPosting.prototype, "scfhs_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], JobPosting.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], JobPosting.prototype, "salary_range", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], JobPosting.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true }),
    __metadata("design:type", String)
], JobPosting.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], JobPosting.prototype, "is_deleted", void 0);
exports.JobPosting = JobPosting = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'job_postings' })
], JobPosting);
exports.JobPostingSchema = mongoose_1.SchemaFactory.createForClass(JobPosting);
let JobApplication = class JobApplication {
};
exports.JobApplication = JobApplication;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], JobApplication.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], JobApplication.prototype, "job_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], JobApplication.prototype, "candidate_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['submitted', 'under_review', 'interviewing', 'accepted', 'rejected'], default: 'submitted', index: true }),
    __metadata("design:type", String)
], JobApplication.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], JobApplication.prototype, "applied_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], JobApplication.prototype, "cover_letter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], JobApplication.prototype, "is_deleted", void 0);
exports.JobApplication = JobApplication = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'job_applications' })
], JobApplication);
exports.JobApplicationSchema = mongoose_1.SchemaFactory.createForClass(JobApplication);
//# sourceMappingURL=job-board.schema.js.map