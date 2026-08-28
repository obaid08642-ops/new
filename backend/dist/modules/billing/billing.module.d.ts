import { StreamableFile } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MailService } from '../mail/mail.module';
export declare class EInvoice {
    id: string;
    invoice_no: string;
    booking_kind: string;
    booking_id: string;
    patient_id: string;
    subtotal: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
    currency: string;
    qr_base64: string;
    status: string;
}
export declare const EInvoiceSchema: import("mongoose").Schema<EInvoice, import("mongoose").Model<EInvoice, any, any, any, import("mongoose").Document<unknown, any, EInvoice, any, {}> & EInvoice & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EInvoice, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<EInvoice>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<EInvoice> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare function tlvQr(sellerName: string, vatNumber: string, isoDate: string, total: number, vat: number): string;
export declare class BillingService {
    private conn;
    constructor(conn: Connection);
    private get invoices();
    private nextInvoiceNo;
    private bookingModelName;
    issue(user: any, kind: string, bookingId: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    myInvoices(user: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, unknown, any, "find", {}>;
    adminList(limit?: number): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, unknown, any, "find", {}>;
    invoicePdf(user: any, kind: string, bookingId: string): Promise<Buffer>;
    emailInvoice(user: any, kind: string, bookingId: string, mail: MailService): Promise<{
        ok: boolean;
        emailed_to: any;
    }>;
}
export declare class BillingController {
    private svc;
    private mail;
    constructor(svc: BillingService, mail: MailService);
    invoice(user: any, kind: string, bookingId: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    invoicePdf(user: any, kind: string, bookingId: string, res: any): Promise<StreamableFile>;
    emailInvoice(user: any, kind: string, bookingId: string): Promise<{
        ok: boolean;
        emailed_to: any;
    }>;
    my(user: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, unknown, any, "find", {}>;
    adminInvoices(limit?: string): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, unknown, any, "find", {}>;
}
export declare class BillingModule {
}
