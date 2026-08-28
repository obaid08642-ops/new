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
exports.FamilyPermissionRequestSchema = exports.FamilyPermissionRequest = exports.SharedCalendarEventSchema = exports.SharedCalendarEvent = exports.FamilyGroupSchema = exports.FamilyGroup = exports.FamilyMember = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
class FamilyMember {
}
exports.FamilyMember = FamilyMember;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FamilyMember.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'member' }),
    __metadata("design:type", String)
], FamilyMember.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], FamilyMember.prototype, "permissions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], FamilyMember.prototype, "joined_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FamilyMember.prototype, "display_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FamilyMember.prototype, "avatar", void 0);
let FamilyGroup = class FamilyGroup extends mongoose_2.Document {
};
exports.FamilyGroup = FamilyGroup;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], FamilyGroup.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], FamilyGroup.prototype, "owner_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FamilyGroup.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], FamilyGroup.prototype, "members", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], FamilyGroup.prototype, "invite_code", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], FamilyGroup.prototype, "invite_expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], FamilyGroup.prototype, "is_deleted", void 0);
exports.FamilyGroup = FamilyGroup = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'family_groups' })
], FamilyGroup);
exports.FamilyGroupSchema = mongoose_1.SchemaFactory.createForClass(FamilyGroup);
let SharedCalendarEvent = class SharedCalendarEvent extends mongoose_2.Document {
};
exports.SharedCalendarEvent = SharedCalendarEvent;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "group_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'reminder' }),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "ref_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], SharedCalendarEvent.prototype, "event_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "created_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "member_user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "member_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "time_label", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SharedCalendarEvent.prototype, "color", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], SharedCalendarEvent.prototype, "is_deleted", void 0);
exports.SharedCalendarEvent = SharedCalendarEvent = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'shared_calendar_events' })
], SharedCalendarEvent);
exports.SharedCalendarEventSchema = mongoose_1.SchemaFactory.createForClass(SharedCalendarEvent);
let FamilyPermissionRequest = class FamilyPermissionRequest extends mongoose_2.Document {
};
exports.FamilyPermissionRequest = FamilyPermissionRequest;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], FamilyPermissionRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], FamilyPermissionRequest.prototype, "group_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FamilyPermissionRequest.prototype, "requester_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FamilyPermissionRequest.prototype, "target_member_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], required: true }),
    __metadata("design:type", Array)
], FamilyPermissionRequest.prototype, "requested_permissions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', index: true }),
    __metadata("design:type", String)
], FamilyPermissionRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], FamilyPermissionRequest.prototype, "responded_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FamilyPermissionRequest.prototype, "response_note", void 0);
exports.FamilyPermissionRequest = FamilyPermissionRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'family_permission_requests' })
], FamilyPermissionRequest);
exports.FamilyPermissionRequestSchema = mongoose_1.SchemaFactory.createForClass(FamilyPermissionRequest);
//# sourceMappingURL=family.schemas.js.map