import { Model, Document, Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class MoyasarPayment {
    booking_id: string;
    booking_kind: string;
    patient_id: string;
    amount: number;
    currency: string;
    moyasar_id?: string;
    status: string;
    payment_url?: string;
    source_type?: string;
    source?: Record<string, any>;
    failure_reason?: string;
    paid_at?: Date;
    refunded_at?: Date;
    refunded_amount: number;
    raw_response?: Record<string, any>;
    callback_url?: string;
    description?: string;
}
export type MoyasarPaymentDocument = MoyasarPayment & Document;
export declare const MoyasarPaymentSchema: import("mongoose").Schema<MoyasarPayment, Model<MoyasarPayment, any, any, any, Document<unknown, any, MoyasarPayment, any, {}> & MoyasarPayment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MoyasarPayment, Document<unknown, {}, import("mongoose").FlatRecord<MoyasarPayment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MoyasarPayment> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class MoyasarService {
    private readonly paymentModel;
    private readonly conn;
    private readonly events;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(paymentModel: Model<MoyasarPaymentDocument>, conn: Connection, events: EventEmitter2);
    private resolveBookingAmount;
    private authHeaders;
    createPayment(params: {
        bookingId: string;
        bookingKind: string;
        patientId: string;
        amount: number;
        description?: string;
        callbackUrl?: string;
        metadata?: Record<string, any>;
        skipBookingValidation?: boolean;
    }): Promise<MoyasarPaymentDocument>;
    syncPaymentStatus(moyasarId: string): Promise<MoyasarPaymentDocument | null>;
    refundPayment(moyasarId: string, amount?: number): Promise<{
        ok: boolean;
        refund?: any;
        sandbox?: boolean;
    }>;
    verifyWebhookSignature(payload: string, signature?: string): boolean;
    handleWebhook(payload: any): Promise<{
        ok: boolean;
    }>;
    getPaymentsByBooking(bookingId: string): Promise<MoyasarPayment[]>;
    getPaymentsByUser(patientId: string, page?: number, limit?: number): Promise<{
        payments: MoyasarPayment[];
        total: number;
        page: number;
        limit: number;
    }>;
}
export declare class MoyasarController {
    private readonly svc;
    constructor(svc: MoyasarService);
    createPayment(user: any, body: {
        booking_id: string;
        booking_kind: string;
        amount: number;
        description?: string;
        callback_url?: string;
    }): Promise<MoyasarPaymentDocument>;
    getByBooking(user: any, bookingId: string): Promise<MoyasarPayment[]>;
    getMyPayments(user: any): Promise<{
        payments: MoyasarPayment[];
        total: number;
        page: number;
        limit: number;
    }>;
    syncStatus(id: string): Promise<MoyasarPaymentDocument>;
    refund(id: string, body: {
        amount?: number;
    }): Promise<{
        ok: boolean;
        refund?: any;
        sandbox?: boolean;
    }>;
    webhook(body: any, signature: string, req: any): Promise<{
        ok: boolean;
    }>;
    callback(): {
        ok: boolean;
        message: string;
    };
}
export declare class MoyasarModule {
}
