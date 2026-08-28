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
exports.ImageProcessingJobSchema = exports.ImageProcessingJob = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ImageProcessingJob = class ImageProcessingJob extends mongoose_2.Document {
};
exports.ImageProcessingJob = ImageProcessingJob;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ImageProcessingJob.prototype, "owner_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['doctor', 'nurse'] }),
    __metadata("design:type", String)
], ImageProcessingJob.prototype, "owner_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ImageProcessingJob.prototype, "data_base64", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ImageProcessingJob.prototype, "mime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ImageProcessingJob.prototype, "original_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true }),
    __metadata("design:type", String)
], ImageProcessingJob.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ImageProcessingJob.prototype, "attempts", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ImageProcessingJob.prototype, "error", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ImageProcessingJob.prototype, "processedAt", void 0);
exports.ImageProcessingJob = ImageProcessingJob = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'image_processing_jobs' })
], ImageProcessingJob);
exports.ImageProcessingJobSchema = mongoose_1.SchemaFactory.createForClass(ImageProcessingJob);
//# sourceMappingURL=image-processing-job.schema.js.map