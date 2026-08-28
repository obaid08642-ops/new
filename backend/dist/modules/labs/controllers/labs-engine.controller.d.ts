import { Model, Types } from 'mongoose';
import { LabBooking } from '../schemas/lab-booking.schema';
import { LabCatalog } from '../schemas/lab-catalog.schema';
export declare class LabsEngineController {
    private labBookingModel;
    private labCatalogModel;
    constructor(labBookingModel: Model<LabBooking>, labCatalogModel: Model<LabCatalog>);
    getQueue(labId: string): Promise<(import("mongoose").Document<unknown, {}, LabBooking, {}, {}> & LabBooking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    respondToBooking(bookingId: string, body: {
        accept: boolean;
        lab_id: string;
    }): Promise<{
        success: boolean;
        data: import("mongoose").Document<unknown, {}, LabBooking, {}, {}> & LabBooking & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        message: string;
    }>;
    collectSample(bookingId: string, body: {
        barcodeToken: string;
    }): Promise<{
        success: boolean;
        data: import("mongoose").Document<unknown, {}, LabBooking, {}, {}> & LabBooking & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        message: string;
    }>;
    finalizeTest(bookingId: string, body: {
        metricResults: any[];
        pdfUrl: string;
    }): Promise<{
        success: boolean;
        parent_appointment_id: Types.ObjectId;
        message: string;
    }>;
    getCatalog(labId: string): Promise<(import("mongoose").Document<unknown, {}, LabCatalog, {}, {}> & LabCatalog & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    updateCatalog(body: {
        lab_id: string;
        test_code: string;
        test_name_ar: string;
        test_name_en: string;
        in_lab_price: number;
        home_collection_price: number;
        accepts_insurance: boolean;
        reference_ranges: any[];
    }): Promise<{
        success: boolean;
        data: import("mongoose").Document<unknown, {}, LabCatalog, {}, {}> & LabCatalog & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    getWallet(labId: string): Promise<{
        success: boolean;
        data: {
            grossRevenue: number;
            insuranceClaims: number;
            platformCommissions: number;
            netPayout: number;
            transactions: any[];
        };
    }>;
}
