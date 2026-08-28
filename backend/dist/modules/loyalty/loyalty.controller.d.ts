import { LoyaltyService } from './loyalty.service';
export declare class LoyaltyController {
    private readonly loyaltyService;
    constructor(loyaltyService: LoyaltyService);
    getConfig(): {
        tiers: {
            id: string;
            label: string;
            icon: string;
            color: string;
            minPts: number;
            maxPts: number;
            perks: string[];
        }[];
        earn_ways: ({
            pts: any;
            action: string;
            reason: string;
            icon: string;
            color: string;
            ptsLabel?: undefined;
        } | {
            pts: any;
            action: string;
            reason: any;
            ptsLabel: string;
            icon: string;
            color: string;
        })[];
    };
    getAccount(req: any): Promise<any>;
    getTransactions(req: any, page: string): Promise<{
        transactions: any;
        total: any;
        page: number;
    }>;
    getLeaderboard(limit: string): Promise<any>;
    getChallenges(req: any): Promise<any>;
    joinChallenge(req: any, id: string): Promise<{
        ok: boolean;
        joined: boolean;
        user_progress: any;
        completed: any;
    }>;
    listRewards(): Promise<any>;
    claimReward(req: any, rewardId: string): Promise<{
        ok: boolean;
        claim_id: any;
        coupon_code: string;
    }>;
    getClaimedRewards(req: any): Promise<any>;
}
