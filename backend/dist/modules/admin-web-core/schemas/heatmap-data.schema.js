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
exports.HeatmapDataSchema = exports.HeatmapData = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let HeatmapData = class HeatmapData {
};
exports.HeatmapData = HeatmapData;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HeatmapData.prototype, "clusterId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HeatmapData.prototype, "latitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HeatmapData.prototype, "longitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HeatmapData.prototype, "intensity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['home_care', 'diabetes_program', 'pharmacy_drop'], required: true }),
    __metadata("design:type", String)
], HeatmapData.prototype, "type", void 0);
exports.HeatmapData = HeatmapData = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HeatmapData);
exports.HeatmapDataSchema = mongoose_1.SchemaFactory.createForClass(HeatmapData);
//# sourceMappingURL=heatmap-data.schema.js.map