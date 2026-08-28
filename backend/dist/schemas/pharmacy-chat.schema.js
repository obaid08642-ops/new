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
exports.PharmacyChatThreadSchema = exports.PharmacyChatThread = exports.ChatMessageSchema = exports.ChatMessage = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let ChatMessage = class ChatMessage {
};
exports.ChatMessage = ChatMessage;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ChatMessage.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "sender_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "sender_role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "text", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "image_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ChatMessage.prototype, "created_at", void 0);
exports.ChatMessage = ChatMessage = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], ChatMessage);
exports.ChatMessageSchema = mongoose_1.SchemaFactory.createForClass(ChatMessage);
let PharmacyChatThread = class PharmacyChatThread {
};
exports.PharmacyChatThread = PharmacyChatThread;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.ChatMessageSchema], default: [] }),
    __metadata("design:type", Array)
], PharmacyChatThread.prototype, "messages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['ACTIVE', 'READ_ONLY'], default: 'ACTIVE' }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], PharmacyChatThread.prototype, "last_message_at", void 0);
exports.PharmacyChatThread = PharmacyChatThread = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_chat_threads' })
], PharmacyChatThread);
exports.PharmacyChatThreadSchema = mongoose_1.SchemaFactory.createForClass(PharmacyChatThread);
//# sourceMappingURL=pharmacy-chat.schema.js.map