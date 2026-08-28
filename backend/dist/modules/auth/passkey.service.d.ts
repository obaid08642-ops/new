import { Model } from 'mongoose';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { PasskeyCredential } from './schemas/passkey-credential.schema';
import { User } from '../../schemas/user.schema';
import { RedisService } from '../redis/redis.service';
export declare class PasskeyService {
    private passkeyModel;
    private userModel;
    private redisService;
    constructor(passkeyModel: Model<PasskeyCredential>, userModel: Model<User>, redisService: RedisService);
    private get rpID();
    private get rpName();
    private get origin();
    get designatedEmail(): string;
    assertEnrollmentAllowed(user: any): Promise<any>;
    countCredentials(userId: string): Promise<number>;
    listCredentials(userId: string): Promise<{
        credential_id: any;
        device_name: any;
        created_at: any;
        last_used_at: any;
    }[]>;
    removeCredential(userId: string, credentialId: string): Promise<{
        ok: boolean;
    }>;
    startEnrollment(user: any): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    finishEnrollment(user: any, response: RegistrationResponseJSON, deviceName?: string): Promise<{
        ok: boolean;
        credential_id: any;
    }>;
    startLogin(user: any): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    finishLogin(response: AuthenticationResponseJSON): Promise<string>;
    private setChallenge;
    private takeChallenge;
}
