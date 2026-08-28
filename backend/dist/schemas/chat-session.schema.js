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
exports.ChatSessionSchema = exports.ChatSession = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let ChatSession = class ChatSession {
};
exports.ChatSession = ChatSession;
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['CLINICAL', 'FAMILY'], index: true }),
    __metadata("design:type", String)
], ChatSession.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, ref: 'Appointment', default: null, index: true }),
    __metadata("design:type", String)
], ChatSession.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, ref: 'FamilyGroup', default: null, index: true }),
    __metadata("design:type", String)
], ChatSession.prototype, "family_group_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['WAITING_FOR_DOCTOR', 'LIVE', 'FOLLOW_UP', 'CLOSED'],
        default: 'WAITING_FOR_DOCTOR',
        index: true
    }),
    __metadata("design:type", String)
], ChatSession.prototype, "status", void 0);
exports.ChatSession = ChatSession = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'chat_sessions' })
], ChatSession);
exports.ChatSessionSchema = mongoose_1.SchemaFactory.createForClass(ChatSession);
//# sourceMappingURL=chat-session.schema.js.map