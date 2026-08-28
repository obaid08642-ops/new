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
exports.WebhooksController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const webhooks_service_1 = require("./webhooks.service");
const auth_guard_2 = require("../../common/auth.guard");
let WebhooksController = class WebhooksController {
    constructor(service) {
        this.service = service;
    }
    async moyasar(body, signature, req) {
        const rawBody = req.rawBody || JSON.stringify(body);
        return this.service.handleMoyasarWebhook(body, signature, rawBody);
    }
    async paytabs(body, signature, req) {
        const rawBody = req.rawBody || JSON.stringify(body);
        return this.service.handlePayTabsWebhook(body, signature, rawBody);
    }
    async sms(body, token) {
        return this.service.handleSmsWebhook(body, token);
    }
    async livekit(authHeader, req) {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        return this.service.handleLiveKitWebhook(rawBody, authHeader);
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_2.Post)('moyasar'),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, common_2.Headers)('moyasar-signature')),
    __param(2, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "moyasar", null);
__decorate([
    (0, common_2.Post)('paytabs'),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, common_2.Headers)('signature')),
    __param(2, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "paytabs", null);
__decorate([
    (0, common_2.Post)('sms'),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, common_2.Headers)('x-sms-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "sms", null);
__decorate([
    (0, common_2.Post)('livekit'),
    __param(0, (0, common_2.Headers)('authorization')),
    __param(1, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "livekit", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('webhooks'),
    (0, auth_guard_2.Public)(),
    __metadata("design:paramtypes", [webhooks_service_1.WebhooksService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map