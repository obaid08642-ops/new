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
exports.CrisisContactSchema = exports.CrisisContact = exports.BreathingSessionSchema = exports.BreathingSession = exports.MeditationSessionSchema = exports.MeditationSession = exports.MoodEntrySchema = exports.MoodEntry = exports.BreathingTechnique = exports.MeditationType = exports.MOOD_SCORE_MAP = exports.MoodValue = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
var MoodValue;
(function (MoodValue) {
    MoodValue["GREAT"] = "great";
    MoodValue["GOOD"] = "good";
    MoodValue["OKAY"] = "okay";
    MoodValue["BAD"] = "bad";
    MoodValue["TERRIBLE"] = "terrible";
})(MoodValue || (exports.MoodValue = MoodValue = {}));
exports.MOOD_SCORE_MAP = {
    [MoodValue.GREAT]: 5,
    [MoodValue.GOOD]: 4,
    [MoodValue.OKAY]: 3,
    [MoodValue.BAD]: 2,
    [MoodValue.TERRIBLE]: 1,
};
var MeditationType;
(function (MeditationType) {
    MeditationType["GUIDED"] = "guided";
    MeditationType["BREATHING"] = "breathing";
    MeditationType["BODY_SCAN"] = "body_scan";
    MeditationType["SLEEP"] = "sleep";
    MeditationType["MINDFULNESS"] = "mindfulness";
})(MeditationType || (exports.MeditationType = MeditationType = {}));
var BreathingTechnique;
(function (BreathingTechnique) {
    BreathingTechnique["BOX_BREATHING"] = "box_breathing";
    BreathingTechnique["FOUR_SEVEN_EIGHT"] = "4_7_8";
    BreathingTechnique["DIAPHRAGMATIC"] = "diaphragmatic";
    BreathingTechnique["EQUAL_BREATHING"] = "equal_breathing";
})(BreathingTechnique || (exports.BreathingTechnique = BreathingTechnique = {}));
let MoodEntry = class MoodEntry {
};
exports.MoodEntry = MoodEntry;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], MoodEntry.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MoodEntry.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(MoodValue) }),
    __metadata("design:type", String)
], MoodEntry.prototype, "mood", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 1, max: 5 }),
    __metadata("design:type", Number)
], MoodEntry.prototype, "energy_level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 1, max: 5 }),
    __metadata("design:type", Number)
], MoodEntry.prototype, "stress_level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 24 }),
    __metadata("design:type", Number)
], MoodEntry.prototype, "sleep_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 500 }),
    __metadata("design:type", String)
], MoodEntry.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], MoodEntry.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: () => new Date() }),
    __metadata("design:type", Date)
], MoodEntry.prototype, "logged_at", void 0);
exports.MoodEntry = MoodEntry = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'mood_entries' })
], MoodEntry);
exports.MoodEntrySchema = mongoose_1.SchemaFactory.createForClass(MoodEntry);
exports.MoodEntrySchema.index({ patient_id: 1, logged_at: -1 });
let MeditationSession = class MeditationSession {
};
exports.MeditationSession = MeditationSession;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], MeditationSession.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MeditationSession.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(MeditationType) }),
    __metadata("design:type", String)
], MeditationSession.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 1, max: 180 }),
    __metadata("design:type", Number)
], MeditationSession.prototype, "duration_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MeditationSession.prototype, "completed", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: () => new Date() }),
    __metadata("design:type", Date)
], MeditationSession.prototype, "logged_at", void 0);
exports.MeditationSession = MeditationSession = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'meditation_sessions' })
], MeditationSession);
exports.MeditationSessionSchema = mongoose_1.SchemaFactory.createForClass(MeditationSession);
exports.MeditationSessionSchema.index({ patient_id: 1, logged_at: -1 });
let BreathingSession = class BreathingSession {
};
exports.BreathingSession = BreathingSession;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], BreathingSession.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], BreathingSession.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(BreathingTechnique) }),
    __metadata("design:type", String)
], BreathingSession.prototype, "technique", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 1, max: 100 }),
    __metadata("design:type", Number)
], BreathingSession.prototype, "rounds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 1, max: 7200 }),
    __metadata("design:type", Number)
], BreathingSession.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: () => new Date() }),
    __metadata("design:type", Date)
], BreathingSession.prototype, "logged_at", void 0);
exports.BreathingSession = BreathingSession = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'breathing_sessions' })
], BreathingSession);
exports.BreathingSessionSchema = mongoose_1.SchemaFactory.createForClass(BreathingSession);
exports.BreathingSessionSchema.index({ patient_id: 1, logged_at: -1 });
let CrisisContact = class CrisisContact {
};
exports.CrisisContact = CrisisContact;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], CrisisContact.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CrisisContact.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 80 }),
    __metadata("design:type", String)
], CrisisContact.prototype, "contact_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 30 }),
    __metadata("design:type", String)
], CrisisContact.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 80 }),
    __metadata("design:type", String)
], CrisisContact.prototype, "relationship", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CrisisContact.prototype, "is_professional", void 0);
exports.CrisisContact = CrisisContact = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'crisis_contacts' })
], CrisisContact);
exports.CrisisContactSchema = mongoose_1.SchemaFactory.createForClass(CrisisContact);
exports.CrisisContactSchema.index({ patient_id: 1, createdAt: -1 });
//# sourceMappingURL=mental-health.schema.js.map