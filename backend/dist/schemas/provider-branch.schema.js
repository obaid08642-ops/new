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
exports.ProviderBranchSchema = exports.ProviderBranch = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let ProviderBranch = class ProviderBranch {
};
exports.ProviderBranch = ProviderBranch;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderBranch.prototype, "_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, ref: 'ProviderProfile', required: true, index: true }),
    __metadata("design:type", String)
], ProviderBranch.prototype, "parent_hospital_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderBranch.prototype, "branch_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderBranch.prototype, "branch_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderBranch.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderBranch.prototype, "district", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number }, required: true, _id: false }),
    __metadata("design:type", Object)
], ProviderBranch.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: String, ref: 'User' }], default: [] }),
    __metadata("design:type", Array)
], ProviderBranch.prototype, "doctors_roster", void 0);
exports.ProviderBranch = ProviderBranch = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_branches' })
], ProviderBranch);
exports.ProviderBranchSchema = mongoose_1.SchemaFactory.createForClass(ProviderBranch);
//# sourceMappingURL=provider-branch.schema.js.map