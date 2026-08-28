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
exports.AdminOrdersConsoleController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const orders_console_service_1 = require("./orders-console.service");
let AdminOrdersConsoleController = class AdminOrdersConsoleController {
    constructor(svc) {
        this.svc = svc;
    }
    list(kind, q, status, from, to, page, limit, sort) {
        return this.svc.list({
            kind, q, status, from, to, sort,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 25,
        });
    }
    async exportCsv(kind, q, status, from, to, res) {
        const output = await this.svc.exportCsv({ kind, q, status, from, to });
        res.setHeader('content-type', 'text/csv; charset=utf-8');
        res.setHeader('content-disposition', `attachment; filename="${output.filename}"`);
        res.setHeader('x-export-truncated', String(output.truncated));
        return `\ufeff${output.csv}`;
    }
    detail(kind, id) {
        return this.svc.detail(kind, id);
    }
    cancel(kind, id, b, me) {
        return this.svc.cancel(kind, id, b?.reason, me);
    }
    refund(kind, id, b, me) {
        return this.svc.refund(kind, id, b || {}, me);
    }
    compensate(kind, id, b, me) {
        return this.svc.compensate(kind, id, b || {}, me);
    }
    reassign(kind, id, b, me) {
        return this.svc.reassign(kind, id, b || {}, me);
    }
    addInternalNote(kind, id, b, me) {
        return this.svc.addInternalNote(kind, id, b?.note, me);
    }
    slaExtend(kind, id, b, me) {
        return this.svc.extendSla(kind, id, b || {}, me);
    }
};
exports.AdminOrdersConsoleController = AdminOrdersConsoleController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_READ),
    __param(0, (0, common_1.Query)('kind')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __param(7, (0, common_1.Query)('sort')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ANALYTICS_EXPORT),
    __param(0, (0, common_1.Query)('kind')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __param(5, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminOrdersConsoleController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)(':kind/:id'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_READ),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(':kind/:id/cancel'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_CANCEL),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':kind/:id/refund'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_REFUND),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "refund", null);
__decorate([
    (0, common_1.Post)(':kind/:id/compensate'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_COMPENSATE),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "compensate", null);
__decorate([
    (0, common_1.Post)(':kind/:id/reassign'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_REASSIGN),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "reassign", null);
__decorate([
    (0, common_1.Post)(':kind/:id/note'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_NOTE_ADD),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "addInternalNote", null);
__decorate([
    (0, common_1.Post)(':kind/:id/sla-extend'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ORDER_SLA_EXTEND),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminOrdersConsoleController.prototype, "slaExtend", null);
exports.AdminOrdersConsoleController = AdminOrdersConsoleController = __decorate([
    (0, common_1.Controller)('admin/orders'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [orders_console_service_1.OrdersConsoleService])
], AdminOrdersConsoleController);
//# sourceMappingURL=admin-orders.controller.js.map