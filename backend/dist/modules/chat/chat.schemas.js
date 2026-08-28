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
exports.ChatMessageSchema = exports.ChatMessage = exports.ChatThreadSchema = exports.ChatThread = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let ChatThread = class ChatThread {
};
exports.ChatThread = ChatThread;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ChatThread.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true, enum: ['direct', 'group', 'booking'] }),
    __metadata("design:type", String)
], ChatThread.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], required: true, index: true }),
    __metadata("design:type", Array)
], ChatThread.prototype, "participant_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatThread.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatThread.prototype, "avatar_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatThread.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatThread.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatThread.prototype, "last_message", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChatThread.prototype, "last_message_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatThread.prototype, "last_message_sender_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], ChatThread.prototype, "unread_counts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ChatThread.prototype, "is_active", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatThread.prototype, "created_by", void 0);
exports.ChatThread = ChatThread = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'chat_threads' })
], ChatThread);
exports.ChatThreadSchema = mongoose_1.SchemaFactory.createForClass(ChatThread);
exports.ChatThreadSchema.index({ participant_ids: 1 });
exports.ChatThreadSchema.index({ booking_kind: 1, booking_id: 1 });
let ChatMessage = class ChatMessage {
};
exports.ChatMessage = ChatMessage;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ChatMessage.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "client_message_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "thread_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "sender_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "sender_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], ChatMessage.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'text', enum: ['text', 'image', 'voice', 'file', 'system'] }),
    __metadata("design:type", String)
], ChatMessage.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "attachment_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "attachment_mime", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "attachment_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ChatMessage.prototype, "attachment_size", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ChatMessage.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "reply_to_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "forwarded_from_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ChatMessage.prototype, "media_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], ChatMessage.prototype, "reactions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ChatMessage.prototype, "read_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ChatMessage.prototype, "delivered_to", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "is_edited", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChatMessage.prototype, "edited_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "is_deleted", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChatMessage.prototype, "deleted_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "is_pinned", void 0);
exports.ChatMessage = ChatMessage = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'chat_messages' })
], ChatMessage);
exports.ChatMessageSchema = mongoose_1.SchemaFactory.createForClass(ChatMessage);
exports.ChatMessageSchema.index({ thread_id: 1, createdAt: -1 });
exports.ChatMessageSchema.index({ thread_id: 1, is_deleted: 1 });
exports.ChatMessageSchema.index({ body: 'text' });
//# sourceMappingURL=chat.schemas.js.map