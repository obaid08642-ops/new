import { OnModuleInit } from '@nestjs/common';
import { BanDocument } from './bans.schema';
import { BanRepository } from "./repositories/ban.repository";
export declare class BansService implements OnModuleInit {
    private banModel;
    private activeBans;
    constructor(banModel: BanRepository);
    onModuleInit(): Promise<void>;
    refreshCache(): Promise<void>;
    ban(adminId: string, type: 'ip' | 'device', value: string, reason?: string, expiresAt?: Date): Promise<BanDocument>;
    unban(value: string): Promise<{
        success: boolean;
    }>;
    isBanned(type: 'ip' | 'device', value: string): boolean;
    getBans(): Promise<any>;
}
