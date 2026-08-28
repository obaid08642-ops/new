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
exports.LabCatalogSchema = exports.LabCatalog = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let LabCatalog = class LabCatalog {
};
exports.LabCatalog = LabCatalog;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], LabCatalog.prototype, "lab_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], LabCatalog.prototype, "test_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabCatalog.prototype, "test_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabCatalog.prototype, "test_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], LabCatalog.prototype, "in_lab_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], LabCatalog.prototype, "home_collection_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: false }),
    __metadata("design:type", Boolean)
], LabCatalog.prototype, "accepts_insurance", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                parameter_name: { type: String, required: true },
                min_bounds: { type: Number, required: true },
                max_bounds: { type: Number, required: true },
                unit_string: { type: String, required: true }
            }],
        default: []
    }),
    __metadata("design:type", Array)
], LabCatalog.prototype, "reference_ranges", void 0);
exports.LabCatalog = LabCatalog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LabCatalog);
exports.LabCatalogSchema = mongoose_1.SchemaFactory.createForClass(LabCatalog);
//# sourceMappingURL=lab-catalog.schema.js.map