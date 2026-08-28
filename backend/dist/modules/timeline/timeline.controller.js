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
exports.TimelineController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const timeline_service_1 = require("./timeline.service");
const auth_guard_2 = require("../../common/auth.guard");
let TimelineController = class TimelineController {
    constructor(svc) {
        this.svc = svc;
    }
    async feed(u, kinds, limit, since, until) {
        const k = kinds ? kinds.split(',').map((x) => x.trim()).filter(Boolean) : undefined;
        return this.svc.build(u, {
            kinds: k,
            limit: limit ? parseInt(limit, 10) : 80,
            since: since ? new Date(since) : undefined,
            until: until ? new Date(until) : undefined,
        });
    }
    async summary(u) {
        return this.svc.summary(u);
    }
};
exports.TimelineController = TimelineController;
__decorate([
    (0, common_2.Get)(),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Query)('kinds')),
    __param(2, (0, common_2.Query)('limit')),
    __param(3, (0, common_2.Query)('since')),
    __param(4, (0, common_2.Query)('until')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], TimelineController.prototype, "feed", null);
__decorate([
    (0, common_2.Get)('summary'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TimelineController.prototype, "summary", null);
exports.TimelineController = TimelineController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('timeline'),
    __metadata("design:paramtypes", [timeline_service_1.TimelineService])
], TimelineController);
//# sourceMappingURL=timeline.controller.js.map