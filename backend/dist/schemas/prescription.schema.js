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
exports.PrescriptionSchema = exports.Prescription = exports.PrescriptionItemSchema = exports.PrescriptionItem = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const enums_1 = require("../common/enums");
const uuid_1 = require("uuid");
let PrescriptionItem = class PrescriptionItem {
};
exports.PrescriptionItem = PrescriptionItem;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "medicine_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "medicine_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "medicine_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "active_ingredient", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "dose", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PrescriptionItem.prototype, "frequency_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PrescriptionItem.prototype, "times_per_day", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PrescriptionItem.prototype, "duration_days", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PrescriptionItem.prototype, "quantity", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "instructions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PrescriptionItem.prototype, "is_manual_entry", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PrescriptionItem.prototype, "verified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'NOT_APPLICABLE', enum: ['NOT_APPLICABLE', 'PENDING_REVIEW', 'REVIEWED', 'REJECTED', 'SUBSTITUTED_APPROVED'] }),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "manual_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "manual_reviewed_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PrescriptionItem.prototype, "manual_reviewed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "manual_review_note", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PrescriptionItem.prototype, "substituted", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionItem.prototype, "substituted_to_medicine_id", void 0);
exports.PrescriptionItem = PrescriptionItem = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], PrescriptionItem);
exports.PrescriptionItemSchema = mongoose_1.SchemaFactory.createForClass(PrescriptionItem);
let Prescription = class Prescription {
};
exports.Prescription = Prescription;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Prescription.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Prescription.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Prescription.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Prescription.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Prescription.prototype, "upload_image", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.PrescriptionItemSchema], default: [] }),
    __metadata("design:type", Array)
], Prescription.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Prescription.prototype, "diagnosis", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Prescription.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: Object.values(enums_1.PrescriptionState),
        default: enums_1.PrescriptionState.CREATED_BY_DOCTOR,
        index: true,
    }),
    __metadata("design:type", String)
], Prescription.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Prescription.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Prescription.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Prescription.prototype, "has_manual_entries", void 0);
exports.Prescription = Prescription = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'prescriptions' })
], Prescription);
exports.PrescriptionSchema = mongoose_1.SchemaFactory.createForClass(Prescription);
//# sourceMappingURL=prescription.schema.js.map