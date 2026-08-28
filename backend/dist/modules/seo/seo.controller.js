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
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const seo_service_1 = require("./seo.service");
const auth_guard_2 = require("../../common/auth.guard");
let SeoController = class SeoController {
    constructor(svc) {
        this.svc = svc;
    }
    async resolve(type, slug) {
        const entity = await this.svc.resolve(type, slug);
        if (!entity)
            throw new common_2.NotFoundException('Entity not found');
        return entity;
    }
    async meta(type, slug) {
        return this.svc.meta(type, slug);
    }
    async build(type, id) {
        return this.svc.buildShareLink(type, id);
    }
    async sitemap(res) {
        const xml = await this.svc.sitemap();
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(xml);
    }
    async llmsTxt(res) {
        const txt = await this.svc.llmsTxt();
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(txt);
    }
    async robots(res) {
        const txt = await this.svc.robots();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(txt);
    }
};
exports.SeoController = SeoController;
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('resolve/:type/:slug'),
    __param(0, (0, common_2.Param)('type')),
    __param(1, (0, common_2.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "resolve", null);
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('meta/:type/:slug'),
    __param(0, (0, common_2.Param)('type')),
    __param(1, (0, common_2.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "meta", null);
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('build/:type/:id'),
    __param(0, (0, common_2.Param)('type')),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "build", null);
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('sitemap.xml'),
    __param(0, (0, common_2.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "sitemap", null);
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('llms.txt'),
    __param(0, (0, common_2.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "llmsTxt", null);
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_2.Get)('robots.txt'),
    __param(0, (0, common_2.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "robots", null);
exports.SeoController = SeoController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('seo'),
    __metadata("design:paramtypes", [seo_service_1.SeoService])
], SeoController);
//# sourceMappingURL=seo.controller.js.map