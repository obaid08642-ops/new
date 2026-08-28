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
exports.LiveKitWebhookGuard = void 0;
const common_1 = require("@nestjs/common");
const livekit_server_sdk_1 = require("livekit-server-sdk");
let LiveKitWebhookGuard = class LiveKitWebhookGuard {
    constructor() {
        this.receiver = new livekit_server_sdk_1.WebhookReceiver(process.env.LIVEKIT_API_KEY || 'fake_key', process.env.LIVEKIT_API_SECRET || 'fake_secret');
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authorizationHeader = request.headers['authorization'];
        if (!authorizationHeader) {
            throw new common_1.UnauthorizedException('Missing cryptographic authorization token header.');
        }
        try {
            const verifiedEvent = this.receiver.receive(request.body, authorizationHeader);
            request.livekitVerifiedEvent = verifiedEvent;
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('LiveKit webhook cryptographic identity mismatch.');
        }
    }
};
exports.LiveKitWebhookGuard = LiveKitWebhookGuard;
exports.LiveKitWebhookGuard = LiveKitWebhookGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LiveKitWebhookGuard);
//# sourceMappingURL=livekit-webhook.guard.js.map