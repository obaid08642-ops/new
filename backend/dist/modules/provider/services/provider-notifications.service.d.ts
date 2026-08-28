import { ProviderNotification, ProviderNotificationType } from '../schemas/requests.schema';
import { ProviderNotificationRepository } from "./repositories/providernotification.repository";
export declare class ProviderNotificationsService {
    private notifs;
    constructor(notifs: ProviderNotificationRepository);
    list(user: any, q: {
        unread_only?: string;
        limit?: string;
        offset?: string;
    }): Promise<{
        items: any;
        total: any;
        unread_count: any;
        limit: number;
        offset: number;
    }>;
    markRead(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    markAllRead(user: any): Promise<{
        ok: boolean;
    }>;
    createSystem(provider_account_id: string, input: {
        type: ProviderNotificationType;
        title_ar: string;
        title_en: string;
        body_ar?: string;
        body_en?: string;
        icon?: string;
        related_id?: string;
        related_type?: string;
    }): Promise<ProviderNotification>;
}
