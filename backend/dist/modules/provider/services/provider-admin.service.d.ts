import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderDocumentRepository } from "./repositories/providerdocument.repository";
import { ProviderBankAccountRepository } from "./repositories/providerbankaccount.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
export declare class ProviderAdminService {
    private accounts;
    private profiles;
    private docs;
    private banks;
    private audit;
    private events;
    constructor(accounts: ProviderAccountRepository, profiles: ProviderAccountProfileRepository, docs: ProviderDocumentRepository, banks: ProviderBankAccountRepository, audit: ProviderAuditLogRepository, events: EventEmitter2);
    private purgeImages;
    private assertAdmin;
    list(user: any, q: {
        status?: string;
        provider_type?: string;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<any>;
    detail(user: any, id: string): Promise<any>;
    detailByUser(user: any, userId: string): Promise<any>;
    private transition;
    approve(user: any, id: string, body: any): Promise<any>;
    reject(user: any, id: string, body: any): Promise<any>;
    requestChanges(user: any, id: string, body: any): Promise<any>;
    suspend(user: any, id: string, body: any): Promise<any>;
}
