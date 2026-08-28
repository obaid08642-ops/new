import { NotificationsService } from './notifications.service';
import { PushService } from '../push/push.module';
export declare class NotificationsController {
    private svc;
    private push;
    constructor(svc: NotificationsService, push: PushService);
    list(user: any): Promise<any[]>;
    registerToken(user: any, body: {
        token: string;
        device?: string;
        platform?: string;
        provider?: string;
        device_id?: string;
        device_name?: string;
    }): Promise<{
        ok: boolean;
        reason: string;
    } | {
        ok: boolean;
        reason?: undefined;
    }>;
    read(id: string, user: any): Promise<{
        ok: boolean;
    }>;
    readAll(user: any): Promise<{
        ok: boolean;
    }>;
    send(body: any): Promise<any>;
    schedule(body: any): Promise<any>;
    deliveryStats(): Promise<{
        by_status: any;
        total: any;
    }>;
}
