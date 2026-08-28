import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export declare class AdminSecurityController {
    private readonly conn;
    private readonly audit;
    constructor(conn: Connection, audit: AdminAuditService);
    auditLog(action?: string, adminId?: string, targetType?: string, targetId?: string, from?: string, to?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
    }>;
    session(me: any): Promise<{
        user: {
            id: any;
            full_name: any;
            email: any;
            phone: any;
            role: any;
            impersonator: {
                id: any;
                full_name: any;
            };
        };
        custom_role_keys: any;
        is_super_admin: boolean;
        permissions: string[];
    }>;
    catalog(): {
        permissions: {
            key: string;
            label_ar: string;
        }[];
        system_roles: {
            key: string;
            label_ar: string;
            permission_count: number;
            is_system: boolean;
        }[];
    };
    listRoles(): Promise<any[]>;
    createRole(b: any, me: any): Promise<any>;
    updateRole(id: string, b: any, me: any): Promise<any>;
    deleteRole(id: string, b: any, me: any): Promise<{
        ok: boolean;
        deleted: string;
    }>;
    assignUserRoles(userId: string, b: any, me: any): Promise<{
        ok: boolean;
        user_id: string;
        custom_role_keys: string[];
    }>;
}
