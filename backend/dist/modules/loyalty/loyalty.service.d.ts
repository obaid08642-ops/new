import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoyaltyAccountRepository } from "./repositories/loyaltyaccount.repository";
import { LoyaltyTransactionRepository } from "./repositories/loyaltytransaction.repository";
import { LoyaltyChallengeRepository } from "./repositories/loyaltychallenge.repository";
import { ChallengeProgressRepository } from "./repositories/challengeprogress.repository";
import { RewardRepository } from "./repositories/reward.repository";
import { RewardClaimRepository } from "./repositories/rewardclaim.repository";
export declare class LoyaltyService {
    private accountM;
    private txM;
    private challengeM;
    private progressM;
    private rewardM;
    private claimM;
    private events?;
    constructor(accountM: LoyaltyAccountRepository, txM: LoyaltyTransactionRepository, challengeM: LoyaltyChallengeRepository, progressM: ChallengeProgressRepository, rewardM: RewardRepository, claimM: RewardClaimRepository, events?: EventEmitter2);
    getTiers(): {
        id: string;
        label: string;
        icon: string;
        color: string;
        minPts: number;
        maxPts: number;
        perks: string[];
    }[];
    getEarnWays(): ({
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
    awardPoints(userId: string, reason: string, refType?: string, refId?: string, overridePoints?: number): Promise<{
        ok: boolean;
        points_awarded: number;
        duplicate?: undefined;
        new_balance?: undefined;
        tier?: undefined;
    } | {
        ok: boolean;
        points_awarded: number;
        duplicate: boolean;
        new_balance?: undefined;
        tier?: undefined;
    } | {
        ok: boolean;
        points_awarded: number;
        new_balance: any;
        tier: string;
        duplicate?: undefined;
    }>;
    private sweepExpired;
    onBookingCompleted(payload: {
        user_id: string;
        booking_id: string;
    }): Promise<void>;
    onOrderDelivered(payload: {
        user_id: string;
        order_id: string;
    }): Promise<void>;
    onReviewSubmitted(payload: {
        user_id: string;
        review_id: string;
    }): Promise<void>;
    onReferralConverted(payload: {
        user_id: string;
        referred_id: string;
    }): Promise<void>;
    onVitalsLogged(payload: {
        user_id: string;
    }): Promise<void>;
    onReferralWelcome(payload: {
        user_id: string;
        referral_id: string;
    }): Promise<void>;
    private updateChallengeProgress;
    getActiveChallenges(userId: string): Promise<any>;
    joinChallenge(userId: string, challengeId: string): Promise<{
        ok: boolean;
        joined: boolean;
        user_progress: any;
        completed: any;
    }>;
    getAccount(userId: string): Promise<any>;
    getTransactions(userId: string, page?: number, limit?: number): Promise<{
        transactions: any;
        total: any;
        page: number;
    }>;
    getLeaderboard(limit?: number): Promise<any>;
    listRewards(): Promise<any>;
    claimReward(userId: string, rewardId: string): Promise<{
        ok: boolean;
        claim_id: any;
        coupon_code: string;
    }>;
    getClaimedRewards(userId: string): Promise<any>;
}
