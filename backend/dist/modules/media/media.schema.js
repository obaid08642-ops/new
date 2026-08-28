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
exports.MediaAssetSchema = exports.MediaAsset = exports.MEDIA_PURPOSES = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
exports.MEDIA_PURPOSES = ['order_prescription', 'chat', 'avatar', 'report'];
let MediaAsset = class MediaAsset {
};
exports.MediaAsset = MediaAsset;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true, index: true }),
    __metadata("design:type", String)
], MediaAsset.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], MediaAsset.prototype, "key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MediaAsset.prototype, "owner_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: exports.MEDIA_PURPOSES, index: true }),
    __metadata("design:type", String)
], MediaAsset.prototype, "purpose", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], MediaAsset.prototype, "thread_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MediaAsset.prototype, "original_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MediaAsset.prototype, "mime_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], MediaAsset.prototype, "size_bytes", void 0);
exports.MediaAsset = MediaAsset = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'media_assets' })
], MediaAsset);
exports.MediaAssetSchema = mongoose_1.SchemaFactory.createForClass(MediaAsset);
exports.MediaAssetSchema.index({ owner_id: 1, purpose: 1, createdAt: -1 });
exports.MediaAssetSchema.index({ thread_id: 1, purpose: 1, createdAt: -1 });
//# sourceMappingURL=media.schema.js.map