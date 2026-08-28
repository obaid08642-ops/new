import { RedisService } from '../redis/redis.service';
export interface PresenceInfo {
    user_id: string;
    online: boolean;
    last_seen: number;
    device_count: number;
}
export declare class PresenceService {
    private readonly redis;
    private readonly logger;
    private readonly ONLINE_TTL;
    private readonly PREFIX;
    constructor(redis: RedisService);
    private key;
    private deviceKey;
    setOnline(userId: string, socketId: string): Promise<void>;
    setOffline(userId: string, socketId: string): Promise<void>;
    heartbeat(userId: string, socketId: string): Promise<void>;
    isOnline(userId: string): Promise<boolean>;
    getPresence(userId: string): Promise<PresenceInfo>;
    getBulkPresence(userIds: string[]): Promise<PresenceInfo[]>;
    getLastSeen(userId: string): Promise<Date | null>;
}
