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
exports.EncounterRecordSchema = exports.EncounterRecord = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let EncounterRecord = class EncounterRecord {
};
exports.EncounterRecord = EncounterRecord;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Appointment', required: true, unique: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], EncounterRecord.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], EncounterRecord.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], EncounterRecord.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], EncounterRecord.prototype, "diagnosis_text", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                medicine_id: { type: mongoose_2.Types.ObjectId, ref: 'Medicine' },
                trade_name: String,
                dosage: String,
                duration_days: Number,
                frequency: String
            }],
        default: []
    }),
    __metadata("design:type", Array)
], EncounterRecord.prototype, "prescribed_medications", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            status: { type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], default: 'NONE' },
            pre_auth_reference_code: String,
            coverage_percentage: Number,
            patient_copay_amount: Number,
            carrier_name: String
        },
        default: {}
    }),
    __metadata("design:type", Object)
], EncounterRecord.prototype, "insurance_claim_snapshot", void 0);
exports.EncounterRecord = EncounterRecord = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], EncounterRecord);
exports.EncounterRecordSchema = mongoose_1.SchemaFactory.createForClass(EncounterRecord);
//# sourceMappingURL=encounter-record.schema.js.map