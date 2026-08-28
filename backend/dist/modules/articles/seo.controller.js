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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
let SeoController = class SeoController {
    constructor(conn) {
        this.conn = conn;
    }
    async resolve(type, slug) {
        const s = decodeURIComponent(slug);
        const bySlugOrName = (extra = {}) => ({
            $or: [{ slug: s }, { id: s }, { name_ar: s }, { name_en: s }], ...extra,
        });
        let doc = null;
        if (type === 'medicine') {
            doc = await this.conn.collection('medicines_master').findOne(bySlugOrName({ is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } });
        }
        else if (type === 'doctor') {
            doc = await this.conn.collection('provider_profiles').findOne(bySlugOrName({ type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1, user_id: 1 } });
            if (doc && !doc.id)
                doc.id = doc.user_id;
        }
        else if (type === 'facility') {
            doc = await this.conn.collection('facilities').findOne(bySlugOrName({ is_active: true, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } })
                || await this.conn.collection('provider_profiles').findOne(bySlugOrName({ type: { $in: ['hospital', 'clinic'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1, user_id: 1 } });
            if (doc && !doc.id)
                doc.id = doc.user_id;
        }
        else if (type === 'lab-service') {
            doc = await this.conn.collection('labservices').findOne(bySlugOrName({ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } });
        }
        else if (type === 'home-care-service') {
            doc = await this.conn.collection('homecareservices').findOne(bySlugOrName({ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } })
                || await this.conn.collection('labservices').findOne(bySlugOrName({ active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }), { projection: { id: 1 } });
        }
        else {
            throw new common_1.NotFoundException('unknown link type');
        }
        if (!doc?.id)
            throw new common_1.NotFoundException('link target not found');
        return { id: doc.id, type };
    }
};
exports.SeoController = SeoController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('resolve/:type/:slug'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "resolve", null);
exports.SeoController = SeoController = __decorate([
    (0, common_1.Controller)('seo'),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], SeoController);
//# sourceMappingURL=seo.controller.js.map