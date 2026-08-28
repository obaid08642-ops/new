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
exports.NotificationItemSchema = exports.NotificationItem = exports.ConsultationNoteSchema = exports.ConsultationNote = exports.DoctorChatMessageSchema = exports.DoctorChatMessage = exports.DoctorAppointmentSchema = exports.DoctorAppointment = exports.DoctorSchema = exports.Doctor = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const slug_util_1 = require("../../common/slug.util");
let Doctor = class Doctor extends mongoose_2.Document {
};
exports.Doctor = Doctor;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Doctor.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], Doctor.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Doctor.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Doctor.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Doctor.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Doctor.prototype, "specialty", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Doctor.prototype, "specialty_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'male' }),
    __metadata("design:type", String)
], Doctor.prototype, "gender", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: ['ar'] }),
    __metadata("design:type", Array)
], Doctor.prototype, "languages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Doctor.prototype, "photo_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Doctor.prototype, "biography", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Doctor.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Doctor.prototype, "reviews_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 50 }),
    __metadata("design:type", Number)
], Doctor.prototype, "consultation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Doctor.prototype, "home_visit_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Doctor.prototype, "video_consultation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Doctor.prototype, "home_visit_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Doctor.prototype, "video_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Doctor.prototype, "voice_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Doctor.prototype, "clinic_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Doctor.prototype, "insurance_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Doctor.prototype, "clinic_location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Doctor.prototype, "clinic_images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Doctor.prototype, "facilities_images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Doctor.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Doctor.prototype, "is_accepting", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Doctor.prototype, "is_online", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], Doctor.prototype, "default_slot_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Doctor.prototype, "weekly_schedule", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Doctor.prototype, "blocked_dates", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], Doctor.prototype, "max_bookings_per_slot", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], Doctor.prototype, "is_deleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'published', index: true }),
    __metadata("design:type", String)
], Doctor.prototype, "status", void 0);
exports.Doctor = Doctor = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'doctors' })
], Doctor);
exports.DoctorSchema = mongoose_1.SchemaFactory.createForClass(Doctor);
exports.DoctorSchema.index({ specialty: 1, is_accepting: 1, is_online: 1 });
exports.DoctorSchema.pre('save', function (next) {
    if (this.isModified('name_ar') || this.isModified('name_en') || !this.slug) {
        const name = this.name_ar || this.name_en || 'doctor';
        this.slug = (0, slug_util_1.buildSlug)(name, this.id);
    }
    next();
});
let DoctorAppointment = class DoctorAppointment extends mongoose_2.Document {
};
exports.DoctorAppointment = DoctorAppointment;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "patient_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'clinic' }),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], DoctorAppointment.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], DoctorAppointment.prototype, "duration_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'scheduled', index: true }),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], DoctorAppointment.prototype, "fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'cash' }),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "insurance_provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'none' }),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "insurance_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], DoctorAppointment.prototype, "documents", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DoctorAppointment.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], DoctorAppointment.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], DoctorAppointment.prototype, "state_history", void 0);
exports.DoctorAppointment = DoctorAppointment = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'doctor_appointments' })
], DoctorAppointment);
exports.DoctorAppointmentSchema = mongoose_1.SchemaFactory.createForClass(DoctorAppointment);
exports.DoctorAppointmentSchema.index({ doctor_id: 1, scheduled_at: 1 });
exports.DoctorAppointmentSchema.index({ patient_id: 1, scheduled_at: -1 });
let DoctorChatMessage = class DoctorChatMessage extends mongoose_2.Document {
};
exports.DoctorChatMessage = DoctorChatMessage;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], DoctorChatMessage.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DoctorChatMessage.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DoctorChatMessage.prototype, "sender_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DoctorChatMessage.prototype, "sender_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DoctorChatMessage.prototype, "text", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], DoctorChatMessage.prototype, "attachment", void 0);
exports.DoctorChatMessage = DoctorChatMessage = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'doctor_chat_messages' })
], DoctorChatMessage);
exports.DoctorChatMessageSchema = mongoose_1.SchemaFactory.createForClass(DoctorChatMessage);
let ConsultationNote = class ConsultationNote extends mongoose_2.Document {
};
exports.ConsultationNote = ConsultationNote;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ConsultationNote.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ConsultationNote.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ConsultationNote.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ConsultationNote.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ConsultationNote.prototype, "diagnosis", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ConsultationNote.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ConsultationNote.prototype, "follow_up_instructions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ConsultationNote.prototype, "prescriptions", void 0);
exports.ConsultationNote = ConsultationNote = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'consultation_notes' })
], ConsultationNote);
exports.ConsultationNoteSchema = mongoose_1.SchemaFactory.createForClass(ConsultationNote);
let NotificationItem = class NotificationItem extends mongoose_2.Document {
};
exports.NotificationItem = NotificationItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], NotificationItem.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], NotificationItem.prototype, "recipient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NotificationItem.prototype, "recipient_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NotificationItem.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NotificationItem.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], NotificationItem.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], NotificationItem.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], NotificationItem.prototype, "entity_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], NotificationItem.prototype, "deep_link", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], NotificationItem.prototype, "read", void 0);
exports.NotificationItem = NotificationItem = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'in_app_notifications' })
], NotificationItem);
exports.NotificationItemSchema = mongoose_1.SchemaFactory.createForClass(NotificationItem);
exports.NotificationItemSchema.index({ recipient_account_id: 1, read: 1, createdAt: -1 });
//# sourceMappingURL=doctors.schemas.js.map