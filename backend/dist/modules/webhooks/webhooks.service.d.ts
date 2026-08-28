import { PharmacyPaymentEvidenceService } from '../pharmacy/services/pharmacy-payment-evidence.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';
export declare class WebhooksService {
    private eventEmitter;
    private readonly redis;
    private readonly paymentEvidence?;
    private readonly logger;
    constructor(eventEmitter: EventEmitter2, redis: RedisService, paymentEvidence?: PharmacyPaymentEvidenceService);
    verifyMoyasar(signature: string | undefined, rawBody: string): boolean;
    verifyPayTabs(signature: string | undefined, rawBody: string): boolean;
    private isReplay;
    private markReplay;
    handleMoyasarWebhook(body: any, signature?: string, rawBody?: string): Promise<{
        status: string;
        event: any;
        deduplicated: boolean;
    } | {
        status: string;
        event: any;
        deduplicated?: undefined;
    }>;
    handlePayTabsWebhook(body: any, signature?: string, rawBody?: string): Promise<{
        status: string;
        event: string;
        deduplicated: boolean;
    } | {
        status: string;
        event: string;
        deduplicated?: undefined;
    }>;
    handleSmsWebhook(body: any, token?: string): Promise<{
        status: string;
    }>;
    handleLiveKitWebhook(rawBody: string, authHeader: string): Promise<{
        ok: boolean;
    }>;
}
