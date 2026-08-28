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
exports.SystemHealthController = void 0;
const common_1 = require("@nestjs/common");
let SystemHealthController = class SystemHealthController {
    checkLiveness() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                redis: 'connected',
                core_api: 'running'
            }
        };
    }
    checkReadiness() {
        return {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }
};
exports.SystemHealthController = SystemHealthController;
__decorate([
    (0, common_1.Get)('liveness'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SystemHealthController.prototype, "checkLiveness", null);
__decorate([
    (0, common_1.Get)('readiness'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SystemHealthController.prototype, "checkReadiness", null);
exports.SystemHealthController = SystemHealthController = __decorate([
    (0, common_1.Controller)('system-health')
], SystemHealthController);
//# sourceMappingURL=system-health.controller.js.map