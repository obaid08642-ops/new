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
exports.BansMiddleware = void 0;
const common_1 = require("@nestjs/common");
const bans_service_1 = require("./bans.service");
let BansMiddleware = class BansMiddleware {
    constructor(bansService) {
        this.bansService = bansService;
    }
    use(req, res, next) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        if (this.bansService.isBanned('ip', ip)) {
            throw new common_1.ForbiddenException('Your IP address has been banned from accessing this service.');
        }
        const deviceId = req.headers['x-device-id'];
        if (deviceId && this.bansService.isBanned('device', deviceId)) {
            throw new common_1.ForbiddenException('Your device has been banned from accessing this service.');
        }
        next();
    }
};
exports.BansMiddleware = BansMiddleware;
exports.BansMiddleware = BansMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bans_service_1.BansService])
], BansMiddleware);
//# sourceMappingURL=bans.middleware.js.map