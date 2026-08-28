import { Connection, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '../../common/enums';
import { UserDocument } from '../../schemas/user.schema';
export declare class AdminController {
    private readonly userModel;
    private readonly deltaModel;
    private readonly appointmentModel;
    private readonly emergencyModel;
    private readonly connection;
    private readonly events?;
    constructor(userModel: Model<UserDocument>, deltaModel: Model<any>, appointmentModel: Model<any>, emergencyModel: Model<any>, connection: Connection, events?: EventEmitter2);
    referralReport(): Promise<{
        funnel: {
            total_invites: any;
            registered: any;
            rewarded: any;
            users_with_code: number;
        };
        points: {
            referral_points_paid: any;
            referral_transactions: any;
        };
        top_referrers: {
            user_id: any;
            name: any;
            invites: any;
            rewarded: any;
            points_earned: any;
        }[];
        recent_invites: {
            id: any;
            referrer: any;
            referred: any;
            status: any;
            reward_points: any;
            created_at: any;
            rewarded_at: any;
        }[];
    }>;
    loyaltyOverview(): Promise<{
        accounts_total: any;
        points_in_circulation: any;
        lifetime_points_issued: any;
        tiers: any;
        top_earners: {
            user_id: any;
            name: any;
            points: any;
            lifetime_points: any;
            tier: any;
        }[];
        recent_transactions: {
            user: any;
            points_delta: any;
            reason: any;
            created_at: any;
        }[];
    }>;
    userOverview(userId: string, daysQ?: string): Promise<any>;
    listDisputes(status?: string): Promise<void>;
    listUsers(page?: string, limit?: string, role?: string, q?: string, sort?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
    }>;
    userStats(): Promise<{
        byRole: Record<string, number>;
        total: any;
    }>;
    private assertOwner;
    private resolveUser;
    listSubAdmins(by: any): Promise<{
        id: any;
        full_name: any;
        email: any;
        phone: any;
        role: any;
        permissions: any;
        is_owner: boolean;
        active: boolean;
        createdAt: any;
        last_login_at: any;
    }[]>;
    createSubAdmin(by: any, body: any): Promise<{
        ok: boolean;
        id: any;
        email: any;
        initial_password: string;
    }>;
    updateSubAdmin(by: any, userId: string, body: any): Promise<{
        ok: boolean;
    }>;
    deleteSubAdmin(by: any, userId: string): Promise<{
        ok: boolean;
    }>;
    createProvider(by: any, body: any): Promise<{
        ok: boolean;
        id: any;
        role: UserRole;
        email: any;
        phone: any;
        initial_password: string;
    }>;
    banUser(userId: string, by?: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    unbanUser(userId: string, by?: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    deleteUser(userId: string, by?: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    approveProvider(userId: string, by?: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    suspendProvider(userId: string, by?: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    getPendingDeltas(): Promise<any[]>;
    approveDelta(deltaId: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    rejectDelta(deltaId: string): Promise<{
        ok: boolean;
        message: string;
    }>;
}
