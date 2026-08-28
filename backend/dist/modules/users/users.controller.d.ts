import { UsersService } from './users.service';
import { UserRole } from '../../common/enums';
export declare class UsersController {
    private users;
    constructor(users: UsersService);
    display(id: string): Promise<{
        display_name: string;
        avatar_url: any;
        locale: any;
        member_since: string;
        health_id: string;
    }>;
    updateDisplay(id: string, body: any): Promise<{
        display_name: string;
        avatar_url: any;
        locale: any;
        member_since: string;
        health_id: string;
    }>;
    healthId(id: string): Promise<{
        health_id: string;
        qr_payload: string;
        issued_at: string;
    }>;
    myProfile(id: string): Promise<any>;
    updateMyProfile(id: string, body: any): Promise<any>;
    getWishlist(id: string): Promise<any>;
    toggleWishlist(id: string, itemId: string): Promise<{
        ok: boolean;
        message?: undefined;
    } | {
        ok: boolean;
        message: string;
    }>;
    getNotificationSettings(id: string): Promise<{
        channels: any;
        categories: any;
    }>;
    updateNotificationSettings(id: string, body: any): Promise<{
        channels: any;
        categories: any;
    }>;
    getStorageDetails(id: string): Promise<{
        used: string;
        total: string;
        limit: number;
        items: {
            label: string;
            val: string;
            pct: number;
            color: string;
        }[];
    }>;
    getPrivacySettings(id: string): Promise<any>;
    updatePrivacySettings(id: string, body: any): Promise<any>;
    getSecuritySettings(id: string): Promise<any>;
    updateSecuritySettings(id: string, body: any): Promise<any>;
    changePassword(id: string, body: any): Promise<{
        success: boolean;
    }>;
    getSessions(id: string): Promise<any[]>;
    revokeSession(id: string, jti: string): Promise<{
        ok: boolean;
    }>;
    list(role: UserRole, search: string): any;
    toggle(id: string, by: any): Promise<{
        ok: boolean;
        active: any;
    }>;
    remove(id: string, by: any): Promise<{
        ok: boolean;
    }>;
}
