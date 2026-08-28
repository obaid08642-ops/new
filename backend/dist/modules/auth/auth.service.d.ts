import { JwtService } from '@nestjs/jwt';
import { PushService } from '../push/push.module';
import { MailService } from '../mail/mail.module';
import { SmsService } from '../sms/sms.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '../../common/enums';
import { UserRepository } from "./repositories/user.repository";
import { PatientProfileRepository } from "./repositories/patientprofile.repository";
import { RedisService } from '../redis/redis.service';
import { PasskeyService } from './passkey.service';
import { DeviceTrustService } from './device-trust.service';
export declare class AuthService {
    private userModel;
    private patientModel;
    private jwt;
    private events;
    private redisService;
    private passkeys?;
    private deviceTrust?;
    private push?;
    private mail?;
    private sms?;
    private readonly OTP_TTL_SECONDS;
    private readonly OTP_MAX_VERIFY_ATTEMPTS;
    private readonly PATIENT_OTP_TTL_SECONDS;
    private readonly PATIENT_EXCHANGE_TTL_SECONDS;
    private readonly PATIENT_OTP_LOCK_TTL_SECONDS;
    constructor(userModel: UserRepository, patientModel: PatientProfileRepository, jwt: JwtService, events: EventEmitter2, redisService: RedisService, passkeys?: PasskeyService, deviceTrust?: DeviceTrustService, push?: PushService, mail?: MailService, sms?: SmsService);
    signToken(user: any, deviceId?: string): {
        accessToken: string;
        refreshToken: string;
    };
    private storeRefreshSession;
    refreshToken(token: string, deviceId?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    revokeAllUserSessions(userId: string): Promise<{
        ok: boolean;
        revoked?: undefined;
    } | {
        ok: boolean;
        revoked: any;
    }>;
    logoutAllDevices(userId: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    recordComplianceConsent(userId: string, documentType: string, version: string): Promise<void>;
    private static assertString;
    private normalizeOtpIdentifier;
    private otpKey;
    private otpIssueRateKey;
    private otpVerifyRateKey;
    private patientOtpKey;
    private patientOtpIssueRateKey;
    private patientOtpVerifyRateKey;
    private patientOtpLockKey;
    private patientExchangeKey;
    private passwordResetKey;
    private opaqueOtpResponse;
    requestPatientOtp(identifier: string): Promise<{
        readonly otp_sent: true;
        readonly channel: "email" | "sms";
        readonly expires_in: number;
    }>;
    verifyPatientOtp(identifier: string, code: string, deviceId?: string): Promise<{
        exchange_token: any;
        expires_in: number;
    }>;
    exchangePatientSession(exchangeToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    forgotPatientPassword(identifier: string): Promise<{
        requested: boolean;
    }>;
    resetPatientPassword(resetToken: string, newPassword: string): Promise<{
        reset: boolean;
    }>;
    registerPatientContract(data: {
        name: string;
        identifier: string;
        password: string;
        locale: string;
        consents: Array<{
            policy_id: string;
            version: string;
        }>;
    }): Promise<{
        registered: boolean;
    }>;
    register(data: {
        full_name: string;
        phone?: string;
        password: string;
        email?: string;
        role?: UserRole;
    }): Promise<{
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            avatar_url: any;
            is_guest: any;
        };
        token: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    login(identifier: string, password: string, ctx?: {
        deviceToken?: string;
        ua?: string;
        ip?: string;
    }): Promise<{
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            avatar_url: any;
            is_guest: any;
        };
        token: {
            accessToken: string;
            refreshToken: string;
        };
        trusted_device: boolean;
        device_name: any;
        requires_passkey?: undefined;
        identifier?: undefined;
        passkey_options?: undefined;
        message?: undefined;
        requires_2fa?: undefined;
    } | {
        requires_passkey: boolean;
        identifier: any;
        passkey_options: import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON;
        message: string;
        user?: undefined;
        token?: undefined;
        trusted_device?: undefined;
        device_name?: undefined;
        requires_2fa?: undefined;
    } | {
        requires_2fa: boolean;
        identifier: string;
        message: string;
        user?: undefined;
        token?: undefined;
        trusted_device?: undefined;
        device_name?: undefined;
        requires_passkey?: undefined;
        passkey_options?: undefined;
    } | {
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            avatar_url: any;
            is_guest: any;
        };
        token: {
            accessToken: string;
            refreshToken: string;
        };
        trusted_device?: undefined;
        device_name?: undefined;
        requires_passkey?: undefined;
        identifier?: undefined;
        passkey_options?: undefined;
        message?: undefined;
        requires_2fa?: undefined;
    }>;
    verify2fa(identifier: string, code: string, ctx?: {
        ua?: string;
        ip?: string;
        trust?: boolean;
    }): Promise<any>;
    completePasskeyLogin(identifier: string, response: any, ctx?: {
        ua?: string;
        ip?: string;
    }): Promise<any>;
    private sendNewDeviceAlert;
    listTrustedDevices(userId: string): Promise<(import("mongoose").FlattenMaps<import("./schemas/trusted-device.schema").TrustedDeviceDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    revokeTrustedDevice(userId: string, deviceId: string): Promise<{
        ok: boolean;
    }>;
    deviceHeartbeat(userId: string, deviceToken: string | undefined, ua?: string, ip?: string): Promise<{
        ok: boolean;
    }>;
    onlineDevices(userId: string): Promise<any[]>;
    guest(phone?: string, deviceId?: string): Promise<{
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            avatar_url: any;
            is_guest: any;
        };
        token: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    private migrateGuestData;
    convertGuest(guestUserId: string, data: {
        full_name: string;
        phone: string;
        password: string;
        email?: string;
    }): Promise<{
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            avatar_url: any;
            is_guest: any;
        };
        token: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    me(userId: string): Promise<{
        id: any;
        full_name: any;
        phone: any;
        email: any;
        role: any;
        avatar_url: any;
        is_guest: any;
    }>;
    publicUser(u: any): {
        id: any;
        full_name: any;
        phone: any;
        email: any;
        role: any;
        avatar_url: any;
        is_guest: any;
    };
    sendOtp(identifier: string): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
    }>;
    verifyOtp(identifier: string, code: string): Promise<{
        ok: boolean;
    }>;
    resetPassword(identifier: string, newPassword: string, code: string): Promise<{
        ok: boolean;
    }>;
    private otpContact;
    socialLogin(dto: {
        provider: 'google' | 'apple' | 'x' | 'snapchat';
        token: string;
        email?: string;
        name?: string;
    }): Promise<{
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            avatar_url: any;
            is_guest: any;
        };
        token: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    private verifyGoogleToken;
    private verifyAppleToken;
    private verifyXToken;
    private verifySnapchatToken;
}
