import { JwtService } from '@nestjs/jwt';
import { ProviderAccountStatus, ProviderType } from '../provider.enums';
import { ProviderOtpService } from './provider-otp.service';
import { OtpPurpose } from '../schemas';
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
import { ProviderSessionRepository } from "./repositories/providersession.repository";
export declare class ProviderAuthService {
    private accounts;
    private profiles;
    private audit;
    private sessions;
    private readonly otp;
    private readonly jwt;
    private logger;
    constructor(accounts: ProviderAccountRepository, profiles: ProviderAccountProfileRepository, audit: ProviderAuditLogRepository, sessions: ProviderSessionRepository, otp: ProviderOtpService, jwt: JwtService);
    private signToken;
    private publicAccount;
    private validateEmail;
    private validatePassword;
    register(input: {
        email: string;
        password: string;
        confirm_password: string;
        provider_type: ProviderType;
        meta?: any;
    }): Promise<{
        account: {
            id: string;
            email: string;
            provider_type: ProviderType;
            status: ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        otp: {
            sent: boolean;
            cooldown_seconds: number;
            expires_in_seconds: number;
            log_only: boolean;
        };
        required_documents: import("../provider.enums").ProviderDocumentType[];
    }>;
    login(input: {
        email: string;
        password: string;
        meta?: any;
    }): Promise<{
        access_token: string;
        refresh_token: string;
        session_id: string;
        provider_id: any;
        provider_type: any;
        role: string;
        permissions: string[];
        profile_status: any;
        account: {
            id: string;
            email: string;
            provider_type: ProviderType;
            status: ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        profile: any;
    }>;
    refresh(input: {
        refresh_token: string;
        device_identifier: string;
        session_id: string;
        meta?: any;
    }): Promise<{
        access_token: string;
        refresh_token: string;
        provider_id: any;
        provider_type: any;
        role: string;
        permissions: string[];
        profile_status: any;
        account: {
            id: string;
            email: string;
            provider_type: ProviderType;
            status: ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        profile: any;
    }>;
    logout(input: {
        session_id: string;
        meta?: any;
    }): Promise<{
        ok: boolean;
    }>;
    sendOtp(input: {
        email: string;
        purpose: OtpPurpose;
        meta?: any;
    }): Promise<{
        sent: boolean;
        cooldown_seconds: number;
        expires_in_seconds: number;
        log_only: boolean;
    }>;
    verifyEmail(input: {
        email: string;
        code: string;
        meta?: any;
    }): Promise<{
        ok: boolean;
        onboarding: boolean;
        account?: undefined;
        token?: undefined;
    } | {
        account: {
            id: string;
            email: string;
            provider_type: ProviderType;
            status: ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        token: string;
        ok?: undefined;
        onboarding?: undefined;
    }>;
    forgotPassword(input: {
        email: string;
        meta?: any;
    }): Promise<{
        ok: boolean;
    }>;
    verifyResetCode(input: {
        email: string;
        code: string;
        meta?: any;
    }): Promise<{
        ok: boolean;
    }>;
    resetPassword(input: {
        email: string;
        code: string;
        new_password: string;
        meta?: any;
    }): Promise<{
        account: {
            id: string;
            email: string;
            provider_type: ProviderType;
            status: ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        token: string;
    }>;
    me(user: any): Promise<{
        account: {
            id: string;
            email: string;
            provider_type: ProviderType;
            status: ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        profile: any;
        required_documents: any;
    }>;
}
