import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
export declare class DeviceTrustService {
    private readonly redis;
    private readonly conn;
    private readonly logger;
    constructor(redis: RedisService, conn: Connection);
    private client;
    challenge(userId: string, platform: 'android' | 'ios'): Promise<{
        nonce: string;
        platform: "ios" | "android";
        ttl_seconds: number;
    }>;
    verify(userId: string, body: {
        platform: 'android' | 'ios';
        token: string;
        nonce: string;
    }): Promise<{
        trusted: boolean;
        reason: string;
        signals?: any;
    }>;
    private verifyPlayIntegrity;
    private verifyAppAttest;
    isTrusted(userId: string, platform: string): Promise<boolean>;
}
export declare class DeviceTrustController {
    private readonly svc;
    constructor(svc: DeviceTrustService);
    challenge(u: any, body: {
        platform: 'android' | 'ios';
    }): Promise<{
        nonce: string;
        platform: "ios" | "android";
        ttl_seconds: number;
    }>;
    guestChallenge(body: {
        platform: 'android' | 'ios';
    }): Promise<{
        nonce: string;
        platform: "ios" | "android";
        ttl_seconds: number;
    }>;
    verify(u: any, body: any): Promise<{
        trusted: boolean;
        reason: string;
        signals?: any;
    }>;
    status(u: any): Promise<{
        user_id: any;
        android_trusted: boolean;
        ios_trusted: boolean;
    }>;
}
export declare class DeviceTrustModule {
}
