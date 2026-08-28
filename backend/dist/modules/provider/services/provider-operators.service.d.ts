import { OperatorStatus } from '../schemas';
import { OperatorRole, OperatorPermission } from '../provider.enums';
import { ProviderMailerService } from './provider-mailer.service';
import { ProviderOperatorRepository } from "./repositories/provideroperator.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
export declare class ProviderOperatorsService {
    private ops;
    private accounts;
    private audit;
    private readonly mailer;
    constructor(ops: ProviderOperatorRepository, accounts: ProviderAccountRepository, audit: ProviderAuditLogRepository, mailer: ProviderMailerService);
    list(user: any): Promise<any>;
    invite(user: any, body: any): Promise<{
        id: string;
        email: string;
        role: OperatorRole;
        status: OperatorStatus;
        permissions: OperatorPermission[];
    }>;
    acceptInvite(body: {
        token: string;
        email: string;
        full_name?: string;
        phone?: string;
        password: string;
    }): Promise<{
        id: any;
        status: any;
        role: any;
    }>;
    update(user: any, id: string, patch: any): Promise<any>;
    disable(user: any, id: string, reason?: string): Promise<any>;
    enable(user: any, id: string): Promise<any>;
    revoke(user: any, id: string): Promise<{
        ok: boolean;
    }>;
}
