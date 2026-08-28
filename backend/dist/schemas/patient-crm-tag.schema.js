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
exports.PatientCrmTagSchema = exports.PatientCrmTag = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
let PatientCrmTag = class PatientCrmTag extends mongoose_2.Document {
};
exports.PatientCrmTag = PatientCrmTag;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], PatientCrmTag.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PatientCrmTag.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PatientCrmTag.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PatientCrmTag.prototype, "is_vip", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PatientCrmTag.prototype, "is_favorite", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PatientCrmTag.prototype, "is_blocked", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientCrmTag.prototype, "blocked_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], PatientCrmTag.prototype, "custom_tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], PatientCrmTag.prototype, "private_notes", void 0);
exports.PatientCrmTag = PatientCrmTag = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'patient_crm_tags' })
], PatientCrmTag);
exports.PatientCrmTagSchema = mongoose_1.SchemaFactory.createForClass(PatientCrmTag);
exports.PatientCrmTagSchema.index({ provider_id: 1, patient_id: 1 }, { unique: true });
//# sourceMappingURL=patient-crm-tag.schema.js.map