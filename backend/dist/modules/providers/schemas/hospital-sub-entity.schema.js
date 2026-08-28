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
exports.HospitalSubEntitySchema = exports.HospitalSubEntity = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let HospitalSubEntity = class HospitalSubEntity {
};
exports.HospitalSubEntity = HospitalSubEntity;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HospitalSubEntity.prototype, "parent_hospital_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'ProviderBranch', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HospitalSubEntity.prototype, "assigned_branch_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, unique: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HospitalSubEntity.prototype, "sub_entity_user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['INTERNAL_PHARMACY', 'INTERNAL_LAB', 'INTERNAL_RADIOLOGY', 'BRANCH_DOCTOR', 'RECEPTIONIST']
    }),
    __metadata("design:type", String)
], HospitalSubEntity.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], HospitalSubEntity.prototype, "is_active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], HospitalSubEntity.prototype, "custom_branch_permissions", void 0);
exports.HospitalSubEntity = HospitalSubEntity = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HospitalSubEntity);
exports.HospitalSubEntitySchema = mongoose_1.SchemaFactory.createForClass(HospitalSubEntity);
//# sourceMappingURL=hospital-sub-entity.schema.js.map