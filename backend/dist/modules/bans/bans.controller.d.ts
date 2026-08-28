import { BansService } from './bans.service';
declare class CreateBanDto {
    type: 'ip' | 'device';
    value: string;
    reason?: string;
    expires_at?: Date;
}
export declare class BansController {
    private bansService;
    constructor(bansService: BansService);
    ban(adminId: string, dto: CreateBanDto): Promise<import("./bans.schema").BanDocument>;
    unban(value: string): Promise<{
        success: boolean;
    }>;
    getBans(): Promise<any>;
}
export {};
