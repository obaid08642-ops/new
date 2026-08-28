import { Connection } from 'mongoose';
export interface ContractParty {
    profileId: string;
    accountId?: string | null;
    userId: string;
    providerType: string;
    nameAr?: string;
    nameEn?: string;
    licenseNumber?: string;
    crNumber?: string;
    city?: string;
    signerName?: string;
    signerRole?: string;
    signatureUrl?: string;
    email?: string;
    phone?: string;
}
export declare class ContractPdfService {
    private readonly conn;
    private logger;
    constructor(conn: Connection);
    private fontPath;
    private isValidFont;
    private loadSignature;
    generate(party: ContractParty): Promise<{
        pdf: Buffer;
        sha256: string;
    }>;
}
