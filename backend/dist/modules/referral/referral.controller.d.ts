import { ReferralService } from './referral.service';
export declare class ReferralController {
    private readonly svc;
    constructor(svc: ReferralService);
    my(req: any): Promise<{
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
    apply(req: any, body: {
        code: string;
    }): Promise<{
        ok: boolean;
        status: string;
    }>;
}
