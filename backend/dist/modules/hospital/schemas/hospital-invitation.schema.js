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
exports.HospitalInvitationSchema = exports.HospitalInvitation = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let HospitalInvitation = class HospitalInvitation {
};
exports.HospitalInvitation = HospitalInvitation;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], HospitalInvitation.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], HospitalInvitation.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], HospitalInvitation.prototype, "invitee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HospitalInvitation.prototype, "invitee_identifier", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'doctor' }),
    __metadata("design:type", String)
], HospitalInvitation.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], HospitalInvitation.prototype, "permissions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending', index: true }),
    __metadata("design:type", String)
], HospitalInvitation.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], HospitalInvitation.prototype, "responded_at", void 0);
exports.HospitalInvitation = HospitalInvitation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'facility_invitations' })
], HospitalInvitation);
exports.HospitalInvitationSchema = mongoose_1.SchemaFactory.createForClass(HospitalInvitation);
//# sourceMappingURL=hospital-invitation.schema.js.map