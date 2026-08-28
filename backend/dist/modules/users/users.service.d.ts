import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { UserRole } from '../../common/enums';
import { UserRepository } from './repositories/user.repository';
import { PatientProfileRepository } from './repositories/patient-profile.repository';
import { ProviderProfileRepository } from './repositories/provider-profile.repository';
import { PatientProfile } from '../../schemas/patient-profile.schema';
import { RedisService } from '../redis/redis.service';
export declare class UsersService {
    private readonly userRepository;
    private readonly patientRepository;
    private readonly providerRepository;
    private readonly conn;
    private readonly redisService;
    private readonly events?;
    constructor(userRepository: UserRepository, patientRepository: PatientProfileRepository, providerRepository: ProviderProfileRepository, conn: Connection, redisService: RedisService, events?: EventEmitter2);
    getWishlist(userId: string): Promise<any>;
    toggleWishlist(userId: string, itemId: string): Promise<{
        ok: boolean;
        message?: undefined;
    } | {
        ok: boolean;
        message: string;
    }>;
    listAll(role?: UserRole, search?: string): any;
    getPatientProfile(user_id: string): Promise<any>;
    private userForPatientContract;
    private memberSince;
    private ensureHealthId;
    getPatientDisplay(userId: string): Promise<{
        display_name: string;
        avatar_url: any;
        locale: any;
        member_since: string;
        health_id: string;
    }>;
    updatePatientWebProfile(userId: string, body: any): Promise<{
        display_name: string;
        avatar_url: any;
        locale: any;
        member_since: string;
        health_id: string;
    }>;
    getHealthId(userId: string): Promise<{
        health_id: string;
        qr_payload: string;
        issued_at: string;
    }>;
    private static readonly PATIENT_PROFILE_EDITABLE;
    updatePatientProfile(user_id: string, data: Partial<PatientProfile> & {
        chronic_conditions?: string[];
    }): Promise<any>;
    private getSetting;
    private setSetting;
    private static readonly NOTIFICATION_CHANNELS;
    private static readonly NOTIFICATION_CATEGORIES;
    private notificationDefaults;
    private normalizeNotificationSettings;
    private validateNotificationPatch;
    getNotificationSettings(id: string): Promise<{
        channels: any;
        categories: any;
    }>;
    updateNotificationSettings(id: string, body: any): Promise<{
        channels: any;
        categories: any;
    }>;
    getStorageDetails(id: string): Promise<{
        used: string;
        total: string;
        limit: number;
        items: {
            label: string;
            val: string;
            pct: number;
            color: string;
        }[];
    }>;
    getPrivacySettings(id: string): Promise<any>;
    updatePrivacySettings(id: string, body: any): Promise<any>;
    getSecuritySettings(id: string): Promise<any>;
    updateSecuritySettings(id: string, body: any): Promise<any>;
    changePassword(id: string, body: any): Promise<{
        success: boolean;
    }>;
    getSessions(id: string): Promise<any[]>;
    revokeSession(id: string, jti: string): Promise<{
        ok: boolean;
    }>;
    toggle(user_id: string, by: any): Promise<{
        ok: boolean;
        active: any;
    }>;
    deleteUser(user_id: string, by: any): Promise<{
        ok: boolean;
    }>;
}
