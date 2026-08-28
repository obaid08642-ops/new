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
exports.HospitalDepartmentSchema = exports.HospitalDepartment = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let HospitalDepartment = class HospitalDepartment {
};
exports.HospitalDepartment = HospitalDepartment;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HospitalDepartment.prototype, "hospital_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'HospitalBranch', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HospitalDepartment.prototype, "branch_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HospitalDepartment.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HospitalDepartment.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HospitalDepartment.prototype, "specialty_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], HospitalDepartment.prototype, "consultation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HospitalDepartment.prototype, "is_active", void 0);
exports.HospitalDepartment = HospitalDepartment = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HospitalDepartment);
exports.HospitalDepartmentSchema = mongoose_1.SchemaFactory.createForClass(HospitalDepartment);
//# sourceMappingURL=hospital-department.schema.js.map