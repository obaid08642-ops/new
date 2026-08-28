import { OtpPurpose } from '../schemas';
import { ProviderMailerService } from './provider-mailer.service';
import { ProviderOtpCodeRepository } from "./repositories/providerotpcode.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
export declare class ProviderOtpService {
    private readonly otpModel;
    private readonly audit;
    private readonly mailer;
    private logger;
    constructor(otpModel: ProviderOtpCodeRepository, audit: ProviderAuditLogRepository, mailer: ProviderMailerService);
    private hash;
    private generateCode;
    private bodyFor;
    issue(email: string, purpose: OtpPurpose, meta?: {
        ip?: string;
        ua?: string;
        account_id?: string;
    }): Promise<{
        sent: boolean;
        cooldown_seconds: number;
        expires_in_seconds: number;
        log_only: boolean;
    }>;
    verify(email: string, purpose: OtpPurpose, code: string, meta?: {
        ip?: string;
        ua?: string;
        account_id?: string;
    }): Promise<{
        ok: boolean;
    }>;
    check(email: string, purpose: OtpPurpose, code: string, meta?: {
        ip?: string;
        ua?: string;
        account_id?: string;
    }): Promise<{
        ok: boolean;
    }>;
}
