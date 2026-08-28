import { Connection } from 'mongoose';
import { StorageService } from '../../storage/storage.module';
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderDocumentRepository } from "./repositories/providerdocument.repository";
import { ProviderBankAccountRepository } from "./repositories/providerbankaccount.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
export declare class ProviderProfileService {
    private accounts;
    private profiles;
    private docs;
    private banks;
    private audit;
    private readonly connection;
    private readonly storage;
    constructor(accounts: ProviderAccountRepository, profiles: ProviderAccountProfileRepository, docs: ProviderDocumentRepository, banks: ProviderBankAccountRepository, audit: ProviderAuditLogRepository, connection: Connection, storage: StorageService);
    getProfile(user: any): Promise<any>;
    updateProfile(user: any, patch: any): Promise<any>;
    private computeCompleteness;
    addPhone(user: any, phone: any): Promise<any>;
    removePhone(user: any, phone_id: string): Promise<any>;
    uploadDocument(user: any, body: any): Promise<any>;
    listDocuments(user: any): Promise<{
        documents: any;
        required: any;
        missing: any;
    }>;
    upsertBank(user: any, body: any): Promise<any>;
    getBank(user: any): Promise<any>;
    banks_list(): readonly [{
        readonly code: "rajhi";
        readonly name_ar: "مصرف الراجحي";
        readonly name_en: "Al Rajhi Bank";
    }, {
        readonly code: "snb";
        readonly name_ar: "البنك الأهلي السعودي";
        readonly name_en: "Saudi National Bank (SNB)";
    }, {
        readonly code: "riyad";
        readonly name_ar: "بنك الرياض";
        readonly name_en: "Riyad Bank";
    }, {
        readonly code: "sab";
        readonly name_ar: "البنك السعودي البريطاني";
        readonly name_en: "SAB (Saudi Awwal Bank)";
    }, {
        readonly code: "alinma";
        readonly name_ar: "مصرف الإنماء";
        readonly name_en: "Alinma Bank";
    }, {
        readonly code: "bsf";
        readonly name_ar: "البنك السعودي الفرنسي";
        readonly name_en: "Banque Saudi Fransi (BSF)";
    }, {
        readonly code: "jazira";
        readonly name_ar: "بنك الجزيرة";
        readonly name_en: "Bank AlJazira";
    }, {
        readonly code: "anb";
        readonly name_ar: "البنك العربي الوطني";
        readonly name_en: "Arab National Bank (ANB)";
    }, {
        readonly code: "albilad";
        readonly name_ar: "بنك البلاد";
        readonly name_en: "Bank AlBilad";
    }, {
        readonly code: "emiratesnbd";
        readonly name_ar: "بنك الإمارات دبي الوطني";
        readonly name_en: "Emirates NBD";
    }, {
        readonly code: "gib";
        readonly name_ar: "بنك الخليج الدولي";
        readonly name_en: "Gulf International Bank";
    }, {
        readonly code: "nbk";
        readonly name_ar: "بنك الكويت الوطني";
        readonly name_en: "NBK";
    }, {
        readonly code: "other";
        readonly name_ar: "بنك آخر";
        readonly name_en: "Other";
    }];
    submitForApproval(user: any): Promise<{
        account: any;
        already: boolean;
    } | {
        account: any;
        already?: undefined;
    }>;
    submitDelta(user: any, body: any): Promise<{
        ok: boolean;
        message: string;
        data: {
            id: string;
            provider_id: any;
            requested_changes: any;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    directory(): Promise<{
        id: any;
        name: string;
        spec: any;
        hospital: any;
    }[]>;
}
