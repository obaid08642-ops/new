import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserRole } from '../../common/enums';
declare class RegisterDto {
    full_name?: string;
    phone?: string;
    password: string;
    email?: string;
    role?: UserRole;
    name?: string;
    identifier?: string;
    locale?: string;
    consents?: Array<{
        policy_id: string;
        version: string;
    }>;
}
declare class GuestDto {
    phone?: string;
    deviceId?: string;
}
declare class PatientOtpRequestDto {
    identifier: string;
}
declare class PatientOtpVerifyDto {
    identifier: string;
    code: string;
    device_id?: string;
}
declare class PatientSessionExchangeDto {
    exchange_token: string;
}
declare class PatientForgotPasswordDto {
    identifier: string;
}
declare class PatientResetPasswordDto {
    reset_token: string;
    new_password: string;
}
declare class ConvertGuestDto {
    full_name: string;
    phone: string;
    password: string;
    email?: string;
}
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    patientOtpRequest(dto: PatientOtpRequestDto): Promise<{
        readonly otp_sent: true;
        readonly channel: "email" | "sms";
        readonly expires_in: number;
    }>;
    patientOtpVerify(dto: PatientOtpVerifyDto): Promise<{
        exchange_token: any;
        expires_in: number;
    }>;
    patientSessionExchange(dto: PatientSessionExchangeDto, req: Request, res: Response): Promise<{
        authenticated: boolean;
    }>;
    patientForgotPassword(dto: PatientForgotPasswordDto): Promise<{
        requested: boolean;
    }>;
    patientResetPassword(dto: PatientResetPasswordDto): Promise<{
        reset: boolean;
    }>;
    register(dto: RegisterDto): Promise<{
        registered: boolean;
    }> | Promise<{
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
    login(dto: any, req: Request, res: Response): Promise<any>;
    guest(dto: GuestDto, deviceId?: string): Promise<{
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
    convertGuest(guestUserId: string, dto: ConvertGuestDto): Promise<{
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
    verify2fa(dto: any, req: Request, res: Response): Promise<any>;
    me(id: string): Promise<{
        id: any;
        full_name: any;
        phone: any;
        email: any;
        role: any;
        avatar_url: any;
        is_guest: any;
    }>;
    trustedDevices(user: any): Promise<(import("mongoose").FlattenMaps<import("./schemas/trusted-device.schema").TrustedDeviceDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    revokeTrustedDevice(user: any, deviceId: string): Promise<{
        ok: boolean;
    }>;
    heartbeat(user: any, req: Request): Promise<{
        ok: boolean;
    }>;
    onlineSessions(user: any): Promise<any[]>;
    refresh(body: {
        refresh_token: string;
    }, deviceId?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logoutAll(user: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    recordConsent(user: any, body: {
        document_type: string;
        version: string;
    }): Promise<{
        ok: boolean;
        message: string;
    }>;
    logout(res: Response): {
        success: boolean;
    };
    sendOtp(body: {
        email?: string;
        phone?: string;
        identifier?: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
    }>;
    verifyOtp(body: {
        email?: string;
        phone?: string;
        identifier?: string;
        code: string;
    }): Promise<{
        ok: boolean;
    }>;
    resetPassword(body: {
        email?: string;
        phone?: string;
        identifier?: string;
        password: string;
        code: string;
    }): Promise<{
        ok: boolean;
    }>;
    socialLogin(body: {
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
}
export {};
