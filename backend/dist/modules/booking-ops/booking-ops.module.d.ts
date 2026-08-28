import { Document, Model } from 'mongoose';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { ServiceDomain } from '../../common/enums';
export declare class BookingAttachment extends Document {
    booking_kind: string;
    booking_id: string;
    by_user_id: string;
    name: string;
    mime: string;
    base64: string;
    purpose: string;
}
export declare const BookingAttachmentSchema: import("mongoose").Schema<BookingAttachment, Model<BookingAttachment, any, any, any, Document<unknown, any, BookingAttachment, any, {}> & BookingAttachment & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BookingAttachment, Document<unknown, {}, import("mongoose").FlatRecord<BookingAttachment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<BookingAttachment> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class BookingOpsService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private providers;
    private attachments;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, providers: Model<any>, attachments: Model<BookingAttachment>);
    private kindAliases;
    private isAdmin;
    private isProvider;
    private providerOwnership;
    private fetchEntity;
    invoice(user: any, type: string, id: string): Promise<{
        booking_id: string;
        kind: ServiceDomain;
        tracking_id: any;
        patient_id: any;
        provider_id: any;
        items: any;
        payment_method: any;
        insurance_provider: any;
        breakdown: {
            subtotal: any;
            tax: number;
            insurance_discount: number;
            delivery_fee: any;
            total: any;
        };
        issued_at: any;
        currency: string;
    }>;
    payment(user: any, type: string, id: string): Promise<{
        booking_id: string;
        kind: ServiceDomain;
        payment_method: any;
        payment_status: any;
        insurance_provider: any;
        insurance_status: any;
        amount: any;
        paid_at: any;
        transaction_id: any;
    }>;
    markPayment(user: any, type: string, id: string, body: {
        status?: string;
        transaction_id?: string;
        insurance_status?: 'pending' | 'verified' | 'approved' | 'rejected';
    }): Promise<any>;
    addAttachment(user: any, type: string, id: string, body: {
        name: string;
        mime: string;
        base64: string;
        purpose?: string;
    }): Promise<Document<unknown, {}, BookingAttachment, {}, {}> & BookingAttachment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    listAttachments(user: any, type: string, id: string): Promise<(import("mongoose").FlattenMaps<BookingAttachment> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getAttachment(user: any, type: string, id: string, attachmentId: string): Promise<import("mongoose").FlattenMaps<BookingAttachment> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export declare class BookingOpsController {
    private svc;
    constructor(svc: BookingOpsService);
    invoice(u: any, t: string, id: string): Promise<{
        booking_id: string;
        kind: ServiceDomain;
        tracking_id: any;
        patient_id: any;
        provider_id: any;
        items: any;
        payment_method: any;
        insurance_provider: any;
        breakdown: {
            subtotal: any;
            tax: number;
            insurance_discount: number;
            delivery_fee: any;
            total: any;
        };
        issued_at: any;
        currency: string;
    }>;
    payment(u: any, t: string, id: string): Promise<{
        booking_id: string;
        kind: ServiceDomain;
        payment_method: any;
        payment_status: any;
        insurance_provider: any;
        insurance_status: any;
        amount: any;
        paid_at: any;
        transaction_id: any;
    }>;
    mark(u: any, t: string, id: string, b: any): Promise<any>;
    addAtt(u: any, t: string, id: string, b: any): Promise<Document<unknown, {}, BookingAttachment, {}, {}> & BookingAttachment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    listAtt(u: any, t: string, id: string): Promise<(import("mongoose").FlattenMaps<BookingAttachment> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class BookingOpsModule {
}
