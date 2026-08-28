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
exports.TreatmentProgramSchema = exports.TreatmentProgram = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let TreatmentProgram = class TreatmentProgram {
};
exports.TreatmentProgram = TreatmentProgram;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], TreatmentProgram.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TreatmentProgram.prototype, "patientId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['diabetes', 'hypertension', 'pregnancy'], index: true }),
    __metadata("design:type", String)
], TreatmentProgram.prototype, "programType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'completed'], default: 'active', index: true }),
    __metadata("design:type", String)
], TreatmentProgram.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], TreatmentProgram.prototype, "completedSteps", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], TreatmentProgram.prototype, "nextSchedule", void 0);
exports.TreatmentProgram = TreatmentProgram = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'treatment_programs' })
], TreatmentProgram);
exports.TreatmentProgramSchema = mongoose_1.SchemaFactory.createForClass(TreatmentProgram);
exports.TreatmentProgramSchema.index({ patientId: 1, programType: 1 }, { unique: true });
//# sourceMappingURL=treatment-program.schema.js.map