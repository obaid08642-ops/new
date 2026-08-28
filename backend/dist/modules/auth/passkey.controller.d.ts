import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
export declare class PasskeyController {
    private auth;
    private passkeys;
    constructor(auth: AuthService, passkeys: PasskeyService);
    enrollOptions(user: any): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    enrollVerify(user: any, body: {
        response: any;
        device_name?: string;
    }): Promise<{
        ok: boolean;
        credential_id: any;
    }>;
    devices(user: any): Promise<{
        credential_id: any;
        device_name: any;
        created_at: any;
        last_used_at: any;
    }[]>;
    remove(user: any, credentialId: string): Promise<{
        ok: boolean;
    }>;
    loginVerify(body: {
        identifier: string;
        response: any;
    }, req: Request, res: Response): Promise<any>;
}
