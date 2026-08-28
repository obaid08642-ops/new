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
exports.ProfileImageMetadataSchema = exports.ProfileImageMetadata = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ProfileImageMetadata = class ProfileImageMetadata extends mongoose_2.Document {
};
exports.ProfileImageMetadata = ProfileImageMetadata;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "owner_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['doctor', 'nurse'] }),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "owner_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "originalImageUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "processedImageUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "mediumImageUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "thumbnailImageUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProfileImageMetadata.prototype, "hasTransparentBackground", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' }),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "processingStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'disabled' }),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "processingProvider", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProfileImageMetadata.prototype, "lastProcessedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProfileImageMetadata.prototype, "error", void 0);
exports.ProfileImageMetadata = ProfileImageMetadata = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'profile_images_metadata' })
], ProfileImageMetadata);
exports.ProfileImageMetadataSchema = mongoose_1.SchemaFactory.createForClass(ProfileImageMetadata);
exports.ProfileImageMetadataSchema.index({ owner_id: 1, processingStatus: 1 });
//# sourceMappingURL=profile-image-metadata.schema.js.map