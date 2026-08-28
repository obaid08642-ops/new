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
exports.PublicCatalogController = exports.MedicinesController = void 0;
const common_1 = require("@nestjs/common");
const medicines_service_1 = require("./medicines.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const permissions_1 = require("../../common/permissions");
let MedicinesController = class MedicinesController {
    constructor(svc) {
        this.svc = svc;
    }
    list(search, q, category, page, limit, cursor, auth) {
        const term = search || q;
        const userId = this.optionalUserId(auth);
        if (cursor !== undefined) {
            return this.svc.cursorPage(term, category, cursor || undefined, parseInt(limit || '30'));
        }
        if (page !== undefined) {
            return this.svc.paginate(term, category, parseInt(page || '1'), parseInt(limit || '30'));
        }
        return this.svc.list(term, category, false, limit ? parseInt(limit) : undefined, userId);
    }
    optionalUserId(auth) {
        try {
            const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
            if (!token)
                return undefined;
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
            return payload?.sub || payload?.id;
        }
        catch {
            return undefined;
        }
    }
    autocomplete(q) {
        return this.svc.autocomplete(q);
    }
    lookupBarcode(body) {
        return this.svc.byBarcode(body?.code || '');
    }
    byBarcode(code) {
        return this.svc.byBarcode(code);
    }
    categoriesList() {
        return this.svc.categories();
    }
    filters() {
        return this.svc.filters();
    }
    compare(body) {
        return this.svc.compare(body?.ids || []);
    }
    hot() {
        return this.svc.hot();
    }
    didYouMean(q) {
        return this.svc.didYouMean(q || '');
    }
    trending(limit) {
        return this.svc.trendingSearches(parseInt(limit || '10'));
    }
    recent(user, limit) {
        return this.svc.recentSearches(user?.id, parseInt(limit || '10'));
    }
    regenerateHot() {
        return this.svc.generateHotMedicines();
    }
    reportShortage(id, user, body) {
        return this.svc.reportShortage(id, user, body || {});
    }
    shortageReports(status, page, limit) {
        return this.svc.listShortageReports(status || 'pending', parseInt(page || '1'), parseInt(limit || '20'));
    }
    approveShortage(reportId, by) {
        return this.svc.approveShortageReport(reportId, by);
    }
    rejectShortage(reportId, by, body) {
        return this.svc.rejectShortageReport(reportId, by, body?.reason);
    }
    clearBadge(id, by) {
        return this.svc.clearShortageBadge(id, by);
    }
    setAvailability(id, by, body) {
        return this.svc.setAvailability(id, by, body?.status);
    }
    suggestImage(id, user, body) {
        return this.svc.suggestImage(id, user || { id: 'guest', role: 'guest' }, body || {});
    }
    imageSuggestions(status, page, limit) {
        return this.svc.listImageSuggestions(status || 'pending', parseInt(page || '1'), parseInt(limit || '20'));
    }
    approveImage(suggestionId, by) {
        return this.svc.approveImageSuggestion(suggestionId, by);
    }
    rejectImage(suggestionId, by, body) {
        return this.svc.rejectImageSuggestion(suggestionId, by, body?.reason);
    }
    suggestChange(id, user, body) {
        return this.svc.suggestChange(id, user || { id: 'guest', role: 'guest' }, body || {});
    }
    suggestNewItem(user, body) {
        return this.svc.suggestNewItem(user || { id: 'guest', role: 'guest' }, body || {});
    }
    changeRequests(status, type, page, limit) {
        return this.svc.listChangeRequests(status || 'pending', type, parseInt(page || '1'), parseInt(limit || '20'));
    }
    approveChange(requestId, by, body) {
        return this.svc.approveChangeRequest(requestId, by, body || {});
    }
    rejectChange(requestId, by, body) {
        return this.svc.rejectChangeRequest(requestId, by, body?.reason);
    }
    adminUpdateCatalog(id, body, by) {
        return this.svc.adminUpdateCatalog(id, body || {}, by);
    }
    adminCatalog(q, category, page, limit, includeDeleted) {
        return this.svc.adminListCatalog({
            q, category,
            page: parseInt(page || '1'), limit: parseInt(limit || '25'),
            includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
        });
    }
    adminCreate(body, by) {
        return this.svc.adminCreateCatalog(body || {}, by);
    }
    adminDelete(id, body, by) {
        return this.svc.adminSetDeleted(id, !body?.restore, by);
    }
    priceHistory(id, page, limit) {
        return this.svc.getPriceHistory(id, parseInt(page || '1'), parseInt(limit || '50'));
    }
    adminReports() {
        return this.svc.adminCatalogReports();
    }
    recentlyViewed(user, limit) {
        return this.svc.recentlyViewed(user?.id, parseInt(limit || '20'));
    }
    one(id) {
        return this.svc.getPublicById(id);
    }
    details(id, auth, lang, acceptLang) {
        const wanted = (lang || (acceptLang || '').split(',')[0] || '').toLowerCase().trim();
        const dbLang = wanted.startsWith('ar') ? 'ar' : wanted.startsWith('ur') ? 'ur' : wanted.startsWith('hi') ? 'hi' : wanted.startsWith('bn') ? 'bn' : (wanted.startsWith('tl') || wanted.startsWith('fil')) ? 'tl' : wanted.startsWith('en') ? 'en' : undefined;
        return this.svc.details(id, this.optionalUserId(auth), dbLang);
    }
    alts(id) {
        return this.svc.alternatives(id);
    }
    createManual(body, user) {
        return this.svc.createManualEntry(body, user.id, user.role);
    }
    pendingLegacyDisabled() {
        throw new common_1.GoneException('legacy_medicine_review_disabled_use_change_requests_contract');
    }
    createCatalogLegacyDisabled() {
        throw new common_1.GoneException('legacy_catalog_create_disabled_use_canonical_contract');
    }
    deleteCatalogLegacyDisabled() {
        throw new common_1.GoneException('legacy_catalog_delete_disabled_use_soft_delete_restore_contract');
    }
    approveLegacyDisabled() {
        throw new common_1.GoneException('legacy_medicine_approve_disabled_use_change_requests_contract');
    }
    rejectLegacyDisabled() {
        throw new common_1.GoneException('legacy_medicine_reject_disabled_use_change_requests_contract');
    }
    updateLegacyDisabled() {
        throw new common_1.GoneException('legacy_medicine_update_disabled_use_admin_catalog_contract');
    }
    importJson(body, by) {
        return this.svc.bulkImport(body.rows || [], by, 'admin', !!body.auto_approve);
    }
    importCsv(body, by) {
        const rows = this.svc.parseCsv(body.csv || '');
        return this.svc.bulkImport(rows, by, 'admin', !!body.auto_approve);
    }
};
exports.MedicinesController = MedicinesController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('cursor')),
    __param(6, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "list", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('autocomplete'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "autocomplete", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('lookup-barcode'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "lookupBarcode", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('by-barcode/:code'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "byBarcode", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "categoriesList", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('filters'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "filters", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('compare'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "compare", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('hot'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "hot", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('search/did-you-mean'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "didYouMean", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('search/trending'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "trending", null);
__decorate([
    (0, common_1.Get)('search/recent'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "recent", null);
__decorate([
    (0, common_1.Post)('admin/hot/regenerate'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "regenerateHot", null);
__decorate([
    (0, common_1.Post)(':id/report-shortage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "reportShortage", null);
__decorate([
    (0, common_1.Get)('admin/shortage-reports'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "shortageReports", null);
__decorate([
    (0, common_1.Post)('admin/shortage-reports/:reportId/approve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_SHORTAGE_DECIDE),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "approveShortage", null);
__decorate([
    (0, common_1.Post)('admin/shortage-reports/:reportId/reject'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_SHORTAGE_DECIDE),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "rejectShortage", null);
__decorate([
    (0, common_1.Post)('admin/catalog/:id/clear-shortage-badge'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_SHORTAGE_DECIDE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "clearBadge", null);
__decorate([
    (0, common_1.Post)('admin/catalog/:id/availability'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_SHORTAGE_DECIDE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "setAvailability", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)(':id/suggest-image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "suggestImage", null);
__decorate([
    (0, common_1.Get)('admin/image-suggestions'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "imageSuggestions", null);
__decorate([
    (0, common_1.Post)('admin/image-suggestions/:suggestionId/approve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('suggestionId')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "approveImage", null);
__decorate([
    (0, common_1.Post)('admin/image-suggestions/:suggestionId/reject'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('suggestionId')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "rejectImage", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)(':id/suggest-change'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "suggestChange", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('suggest-new-item'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "suggestNewItem", null);
__decorate([
    (0, common_1.Get)('admin/change-requests'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "changeRequests", null);
__decorate([
    (0, common_1.Post)('admin/change-requests/:requestId/approve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('requestId')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "approveChange", null);
__decorate([
    (0, common_1.Post)('admin/change-requests/:requestId/reject'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('requestId')),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "rejectChange", null);
__decorate([
    (0, common_1.Patch)('admin/catalog/:id'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_UPDATE, permissions_1.Permission.CATALOG_PRICE_WRITE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "adminUpdateCatalog", null);
__decorate([
    (0, common_1.Get)('admin/catalog'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_READ),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "adminCatalog", null);
__decorate([
    (0, common_1.Post)('admin/catalog'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_CREATE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "adminCreate", null);
__decorate([
    (0, common_1.Post)('admin/catalog/:id/delete'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_DELETE_RESTORE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "adminDelete", null);
__decorate([
    (0, common_1.Get)('admin/catalog/:id/price-history'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_READ),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MedicinesController.prototype, "priceHistory", null);
__decorate([
    (0, common_1.Get)('admin/reports'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "adminReports", null);
__decorate([
    (0, common_1.Get)('me/recently-viewed'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "recentlyViewed", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "one", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':id/details'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __param(2, (0, common_1.Query)('lang')),
    __param(3, (0, common_1.Headers)('accept-language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "details", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':id/alternatives'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "alts", null);
__decorate([
    (0, common_1.Post)('manual-entry'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "createManual", null);
__decorate([
    (0, common_1.Get)('admin/pending-review'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "pendingLegacyDisabled", null);
__decorate([
    (0, common_1.Post)('admin/catalog-legacy-disabled'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "createCatalogLegacyDisabled", null);
__decorate([
    (0, common_1.Delete)('admin/catalog/:id/legacy-delete-disabled'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "deleteCatalogLegacyDisabled", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "approveLegacyDisabled", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "rejectLegacyDisabled", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "updateLegacyDisabled", null);
__decorate([
    (0, common_1.Post)('admin/import-json'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_IMPORT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "importJson", null);
__decorate([
    (0, common_1.Post)('admin/import-csv'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CATALOG_IMPORT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicinesController.prototype, "importCsv", null);
exports.MedicinesController = MedicinesController = __decorate([
    (0, common_1.Controller)('medicines'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [medicines_service_1.MedicinesService])
], MedicinesController);
let PublicCatalogController = class PublicCatalogController {
    constructor(svc) {
        this.svc = svc;
    }
    fragment(locale, category) {
        return this.svc.publicCatalogFragment(locale, category);
    }
};
exports.PublicCatalogController = PublicCatalogController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':locale/:category.json'),
    __param(0, (0, common_1.Param)('locale')),
    __param(1, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicCatalogController.prototype, "fragment", null);
exports.PublicCatalogController = PublicCatalogController = __decorate([
    (0, common_1.Controller)('public/catalog'),
    __metadata("design:paramtypes", [medicines_service_1.MedicinesService])
], PublicCatalogController);
//# sourceMappingURL=medicines.controller.js.map