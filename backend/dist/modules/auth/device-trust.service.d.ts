import { Model } from 'mongoose';
import { TrustedDeviceDocument } from './schemas/trusted-device.schema';
import { RedisService } from '../redis/redis.service';
export declare class DeviceTrustService {
    private readonly model;
    private readonly redis;
    private readonly logger;
    constructor(model: Model<TrustedDeviceDocument>, redis: RedisService);
    private hash;
    private deviceNameFromUa;
    issue(userId: string, ua?: string, ip?: string, name?: string): Promise<{
        token: string;
        device: any;
    }>;
    validate(userId: string, token: string | undefined, ip?: string): Promise<any | null>;
    list(userId: string): Promise<(import("mongoose").FlattenMaps<TrustedDeviceDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    revoke(userId: string, deviceId: string): Promise<{
        ok: boolean;
    }>;
    heartbeat(userId: string, deviceToken: string | undefined, ua?: string, ip?: string): Promise<{
        ok: boolean;
    }>;
    onlineSessions(userId: string): Promise<any[]>;
}
