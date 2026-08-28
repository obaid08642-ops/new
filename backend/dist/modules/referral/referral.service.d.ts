import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ReferralService {
    private connection;
    private events;
    constructor(connection: Connection, events: EventEmitter2);
    private get users();
    private get invites();
    private generateCode;
    getOrCreateCode(userId: string): Promise<string>;
    myDashboard(userId: string): Promise<{
        code: string;
        stats: {
            total: number;
            registered: number;
            rewarded: number;
            earned_points: any;
        };
        invites: {
            id: any;
            name: any;
            status: any;
            reward_points: any;
            created_at: any;
            rewarded_at: any;
        }[];
    }>;
    apply(userId: string, rawCode: string): Promise<{
        ok: boolean;
        status: string;
    }>;
    onBookingCompleted(payload: {
        user_id: string;
        booking_id: string;
    }): Promise<void>;
}
