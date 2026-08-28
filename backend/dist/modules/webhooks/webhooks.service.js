"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const pharmacy_payment_evidence_service_1 = require("../pharmacy/services/pharmacy-payment-evidence.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const crypto = __importStar(require("crypto"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
const redis_service_1 = require("../redis/redis.service");
const isProd = () => process.env.NODE_ENV === 'production';
function timingSafeEq(a, b) {
    try {
        const ba = Buffer.from(a || '', 'utf8');
        const bb = Buffer.from(b || '', 'utf8');
        if (ba.length !== bb.length)
            return false;
        return crypto.timingSafeEqual(ba, bb);
    }
    catch {
        return false;
    }
}
let WebhooksService = class WebhooksService {
    constructor(eventEmitter, redis, paymentEvidence) {
        this.eventEmitter = eventEmitter;
        this.redis = redis;
        this.paymentEvidence = paymentEvidence;
        this.logger = new common_1.Logger('Webhooks');
    }
    verifyMoyasar(signature, rawBody) {
        const secret = process.env.MOYASAR_WEBHOOK_SECRET;
        if (!secret) {
            if (isProd()) {
                this.logger.error('MOYASAR_WEBHOOK_SECRET is not set — rejecting webhook (fail-closed)');
                return false;
            }
            return true;
        }
        if (!signature)
            return false;
        const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        return timingSafeEq(signature, digest);
    }
    verifyPayTabs(signature, rawBody) {
        const serverKey = process.env.PAYTABS_SERVER_KEY;
        if (!serverKey) {
            if (isProd()) {
                this.logger.error('PAYTABS_SERVER_KEY is not set — rejecting webhook (fail-closed)');
                return false;
            }
            return true;
        }
        if (!signature)
            return false;
        const digest = crypto.createHmac('sha256', serverKey).update(rawBody).digest('hex');
        return timingSafeEq(signature, digest);
    }
    async isReplay(kind, id) {
        if (!id)
            return false;
        const key = `webhook_seen:${kind}:${id}`;
        return await this.redis.exists(key);
    }
    async markReplay(kind, id) {
        if (!id)
            return;
        const key = `webhook_seen:${kind}:${id}`;
        const firstSeen = await this.redis.setnx(key, String(Date.now()));
        if (firstSeen)
            await this.redis.expire(key, 24 * 3600);
    }
    async handleMoyasarWebhook(body, signature, rawBody) {
        if (!this.verifyMoyasar(signature, rawBody ?? JSON.stringify(body))) {
            throw new common_1.BadRequestException('Invalid signature');
        }
        const event = body.event;
        const data = body.data;
        const dedupId = body?.data?.id ?? body?.id;
        if (await this.isReplay(`moyasar:${event}`, dedupId)) {
            return { status: 'success', event, deduplicated: true };
        }
        if (event === 'payment.paid') {
            if (!this.paymentEvidence)
                throw new common_1.BadRequestException('payment_evidence_writer_unavailable');
            await this.paymentEvidence.recordVerifiedGatewayPayment('moyasar', data);
        }
        else {
            await this.eventEmitter.emitAsync(`moyasar.${event}`, data);
        }
        await this.markReplay(`moyasar:${event}`, dedupId);
        return { status: 'success', event };
    }
    async handlePayTabsWebhook(body, signature, rawBody) {
        if (!this.verifyPayTabs(signature, rawBody ?? JSON.stringify(body))) {
            throw new common_1.BadRequestException('Invalid signature');
        }
        const event = body.tran_ref ? 'payment.status' : 'unknown';
        if (await this.isReplay('paytabs', body.tran_ref)) {
            return { status: 'success', event, deduplicated: true };
        }
        await this.eventEmitter.emitAsync(`paytabs.${event}`, body);
        await this.markReplay('paytabs', body.tran_ref);
        return { status: 'success', event };
    }
    async handleSmsWebhook(body, token) {
        const expectedToken = process.env.SMS_WEBHOOK_TOKEN;
        if (!expectedToken) {
            if (isProd())
                throw new common_1.BadRequestException('SMS webhook not configured');
        }
        else if (!token || !timingSafeEq(token, expectedToken)) {
            throw new common_1.BadRequestException('Invalid token');
        }
        await this.eventEmitter.emitAsync('sms.status_updated', body);
        return { status: 'success' };
    }
    async handleLiveKitWebhook(rawBody, authHeader) {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        if (!apiKey || !apiSecret) {
            throw new common_1.BadRequestException('LiveKit credentials not configured');
        }
        try {
            const receiver = new livekit_server_sdk_1.WebhookReceiver(apiKey, apiSecret);
            const event = await receiver.receive(rawBody, authHeader);
            await this.eventEmitter.emitAsync(`livekit.${event.event}`, event);
            return { ok: true };
        }
        catch (err) {
            throw new common_1.BadRequestException(`Webhook verification failed: ${err.message}`);
        }
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        redis_service_1.RedisService,
        pharmacy_payment_evidence_service_1.PharmacyPaymentEvidenceService])
], WebhooksService);
//# sourceMappingURL=webhooks.service.js.map