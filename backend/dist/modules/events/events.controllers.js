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
exports.AdminEventsController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const event_bus_service_1 = require("./event-bus.service");
let AdminEventsController = class AdminEventsController {
    constructor(bus) {
        this.bus = bus;
    }
    async list(type, entity_type, entity_id, pharmacy_account_id, patient_account_id, since_minutes, limit) {
        const since = since_minutes ? new Date(Date.now() - parseInt(since_minutes, 10) * 60_000) : undefined;
        return this.bus.list({ type, entity_type, entity_id, pharmacy_account_id, patient_account_id, since, limit: limit ? parseInt(limit, 10) : undefined });
    }
    async trace(entity_type, entity_id) {
        return this.bus.list({ entity_type, entity_id, limit: 500 });
    }
};
exports.AdminEventsController = AdminEventsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('entity_type')),
    __param(2, (0, common_1.Query)('entity_id')),
    __param(3, (0, common_1.Query)('pharmacy_account_id')),
    __param(4, (0, common_1.Query)('patient_account_id')),
    __param(5, (0, common_1.Query)('since_minutes')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('trace'),
    __param(0, (0, common_1.Query)('entity_type')),
    __param(1, (0, common_1.Query)('entity_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "trace", null);
exports.AdminEventsController = AdminEventsController = __decorate([
    (0, common_1.Controller)('admin/events'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], AdminEventsController);
//# sourceMappingURL=events.controllers.js.map