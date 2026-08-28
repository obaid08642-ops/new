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
exports.MedicineSchema = exports.Medicine = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
const slug_util_1 = require("../common/slug.util");
let Medicine = class Medicine {
};
exports.Medicine = Medicine;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Medicine.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], Medicine.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: 'text' }),
    __metadata("design:type", String)
], Medicine.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: 'text' }),
    __metadata("design:type", String)
], Medicine.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: 'text' }),
    __metadata("design:type", String)
], Medicine.prototype, "active_ingredient", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "manufacturer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'medications', index: true }),
    __metadata("design:type", String)
], Medicine.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Medicine.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "image", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "requires_prescription", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "verified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "public_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "indexing_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true }),
    __metadata("design:type", String)
], Medicine.prototype, "medical_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Medicine.prototype, "last_reviewed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "provenance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Medicine.prototype, "translations", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'master' }),
    __metadata("design:type", String)
], Medicine.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "created_by_user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "created_by_role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "approved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Medicine.prototype, "approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "rejected_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Medicine.prototype, "usage_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Medicine.prototype, "barcode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "dosage_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "dosage_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "warnings_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "warnings_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "side_effects_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "side_effects_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "interactions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "contraindications_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "contraindications_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "form", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "strength", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "cold_chain", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "controlled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: 'text' }),
    __metadata("design:type", String)
], Medicine.prototype, "generic_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "indications_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "indications_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "usage_instructions_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "usage_instructions_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "pregnancy_info_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "pregnancy_info_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "breastfeeding_info_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "breastfeeding_info_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "storage_conditions_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "storage_conditions_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [], index: true }),
    __metadata("design:type", Array)
], Medicine.prototype, "alternatives", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "related_product_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Medicine.prototype, "sub_category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "categories", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "package_size", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Medicine.prototype, "old_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "online_exclusive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "precautions_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "precautions_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "more_info_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "more_info_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "image_1", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "image_2", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "image_3", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "image_4", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "image_5", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "seo_description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "seo_description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Medicine.prototype, "covered_by_insurance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Medicine.prototype, "aggregate_stock", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Medicine.prototype, "pharmacies_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'none', enum: ['none', 'availability_may_be_limited', 'admin_flagged_shortage', 'discontinued'], index: true }),
    __metadata("design:type", String)
], Medicine.prototype, "availability_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Medicine.prototype, "shortage_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "is_deleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], Medicine.prototype, "version", void 0);
exports.Medicine = Medicine = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'medicines_master' })
], Medicine);
exports.MedicineSchema = mongoose_1.SchemaFactory.createForClass(Medicine);
exports.MedicineSchema.pre('save', function (next) {
    if (this.isModified('name_ar') || this.isModified('name_en') || !this.slug) {
        const name = this.name_ar || this.name_en || 'item';
        this.slug = (0, slug_util_1.buildSlug)(name, this.id);
    }
    next();
});
//# sourceMappingURL=medicine.schema.js.map