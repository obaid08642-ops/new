import { ProvidersService } from './providers.service';
import { ProviderType, ProviderStatus } from '../../common/enums';
export declare class ProvidersController {
    private svc;
    constructor(svc: ProvidersService);
    apply(body: any): Promise<{
        ok: boolean;
        user: any;
        profile: any;
    }>;
    list(type: ProviderType, city: string, company?: string, network?: string, klass?: string): Promise<any>;
    map(type?: string, lat?: string, lng?: string, radius?: string): Promise<any>;
    one(id: string): Promise<any>;
    mine(user: any): Promise<any>;
    adminCreate(body: any, admin: any): Promise<{
        ok: boolean;
        user: any;
        profile: any;
        generated_password: any;
    }>;
    adminAll(type: ProviderType, status: ProviderStatus, search: string): Promise<any>;
    pending(): Promise<any>;
    approve(id: string, admin: any): Promise<any>;
    reject(id: string, admin: any, body: {
        reason?: string;
    }): Promise<any>;
    suspend(id: string, admin: any, body: {
        reason?: string;
    }): Promise<any>;
    seedDemo(): Promise<void>;
}
