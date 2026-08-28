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
exports.MaternityProfileSchema = exports.MaternityProfile = exports.InfantGrowthLogSchema = exports.InfantGrowthLog = exports.ContractionLogSchema = exports.ContractionLog = exports.KickLogSchema = exports.KickLog = exports.CheckupSchema = exports.Checkup = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Checkup = class Checkup {
};
exports.Checkup = Checkup;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Checkup.prototype, "week", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Checkup.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Checkup.prototype, "done", void 0);
exports.Checkup = Checkup = __decorate([
    (0, mongoose_1.Schema)()
], Checkup);
exports.CheckupSchema = mongoose_1.SchemaFactory.createForClass(Checkup);
let KickLog = class KickLog {
};
exports.KickLog = KickLog;
__decorate([
    (0, mongoose_1.Prop)({ default: () => new mongoose_2.Types.ObjectId() }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], KickLog.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], KickLog.prototype, "count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], KickLog.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], KickLog.prototype, "date", void 0);
exports.KickLog = KickLog = __decorate([
    (0, mongoose_1.Schema)()
], KickLog);
exports.KickLogSchema = mongoose_1.SchemaFactory.createForClass(KickLog);
let ContractionLog = class ContractionLog {
};
exports.ContractionLog = ContractionLog;
__decorate([
    (0, mongoose_1.Prop)({ default: () => new mongoose_2.Types.ObjectId() }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ContractionLog.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ContractionLog.prototype, "interval_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ContractionLog.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ContractionLog.prototype, "date", void 0);
exports.ContractionLog = ContractionLog = __decorate([
    (0, mongoose_1.Schema)()
], ContractionLog);
exports.ContractionLogSchema = mongoose_1.SchemaFactory.createForClass(ContractionLog);
let InfantGrowthLog = class InfantGrowthLog {
};
exports.InfantGrowthLog = InfantGrowthLog;
__decorate([
    (0, mongoose_1.Prop)({ default: () => new mongoose_2.Types.ObjectId() }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], InfantGrowthLog.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], InfantGrowthLog.prototype, "month", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InfantGrowthLog.prototype, "weight_kg", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InfantGrowthLog.prototype, "height_cm", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], InfantGrowthLog.prototype, "head_circ_cm", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], InfantGrowthLog.prototype, "date", void 0);
exports.InfantGrowthLog = InfantGrowthLog = __decorate([
    (0, mongoose_1.Schema)()
], InfantGrowthLog);
exports.InfantGrowthLogSchema = mongoose_1.SchemaFactory.createForClass(InfantGrowthLog);
let MaternityProfile = class MaternityProfile {
};
exports.MaternityProfile = MaternityProfile;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, unique: true }),
    __metadata("design:type", String)
], MaternityProfile.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], MaternityProfile.prototype, "is_pregnant", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MaternityProfile.prototype, "due_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MaternityProfile.prototype, "last_period_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MaternityProfile.prototype, "prev_period_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], MaternityProfile.prototype, "cycle_length", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], MaternityProfile.prototype, "is_regular", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], MaternityProfile.prototype, "current_week", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.CheckupSchema], default: [] }),
    __metadata("design:type", Array)
], MaternityProfile.prototype, "checkups", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.KickLogSchema], default: [] }),
    __metadata("design:type", Array)
], MaternityProfile.prototype, "kicks_log", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.ContractionLogSchema], default: [] }),
    __metadata("design:type", Array)
], MaternityProfile.prototype, "contractions_log", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.InfantGrowthLogSchema], default: [] }),
    __metadata("design:type", Array)
], MaternityProfile.prototype, "infant_growth", void 0);
exports.MaternityProfile = MaternityProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MaternityProfile);
exports.MaternityProfileSchema = mongoose_1.SchemaFactory.createForClass(MaternityProfile);
//# sourceMappingURL=maternity.schema.js.map