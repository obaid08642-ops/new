import { NotificationsService } from '../notifications/notifications.service';
export declare class NotificationService {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    create(data: {
        user_id?: string;
        role?: string;
        title_key: string;
        body_key: string;
        params?: any;
        type?: any;
        priority?: any;
        action?: any;
    }): Promise<any>;
    listForUser(user: any): Promise<any[]>;
    markRead(id: string, user: any): Promise<{
        ok: boolean;
    }>;
    markAllRead(user: any): Promise<{
        ok: boolean;
    }>;
}
