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
exports.HomeCareNurseSchema = exports.HomeCareNurse = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let HomeCareNurse = class HomeCareNurse extends mongoose_2.Document {
};
exports.HomeCareNurse = HomeCareNurse;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareNurse.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareNurse.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareNurse.prototype, "gender", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareNurse.prototype, "facility_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareNurse.prototype, "degree", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HomeCareNurse.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], HomeCareNurse.prototype, "distance_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ user: String, text: String, rating: Number }] }),
    __metadata("design:type", Array)
], HomeCareNurse.prototype, "reviews", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String] }),
    __metadata("design:type", Array)
], HomeCareNurse.prototype, "supported_services", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String] }),
    __metadata("design:type", Array)
], HomeCareNurse.prototype, "supported_packages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String] }),
    __metadata("design:type", Array)
], HomeCareNurse.prototype, "available_frequencies", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HomeCareNurse.prototype, "location", void 0);
exports.HomeCareNurse = HomeCareNurse = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HomeCareNurse);
exports.HomeCareNurseSchema = mongoose_1.SchemaFactory.createForClass(HomeCareNurse);
//# sourceMappingURL=home-care-nurse.schema.js.map