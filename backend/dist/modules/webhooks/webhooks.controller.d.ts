import { WebhooksService } from './webhooks.service';
import { Request } from 'express';
export declare class WebhooksController {
    private readonly service;
    constructor(service: WebhooksService);
    moyasar(body: any, signature: string, req: Request): Promise<{
        status: string;
        event: any;
        deduplicated: boolean;
    } | {
        status: string;
        event: any;
        deduplicated?: undefined;
    }>;
    paytabs(body: any, signature: string, req: Request): Promise<{
        status: string;
        event: string;
        deduplicated: boolean;
    } | {
        status: string;
        event: string;
        deduplicated?: undefined;
    }>;
    sms(body: any, token: string): Promise<{
        status: string;
    }>;
    livekit(authHeader: string, req: Request): Promise<{
        ok: boolean;
    }>;
}
