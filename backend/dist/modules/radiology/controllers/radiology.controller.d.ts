import { Model, Types } from 'mongoose';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';
export declare class RadiologyController {
    private radBookingModel;
    private radServiceModel;
    private userModel;
    constructor(radBookingModel: Model<RadiologyBooking>, radServiceModel: Model<any>, userModel: Model<any>);
    book(user: any, body: any): Promise<{
        id: any;
        status: string;
        message: string;
    }>;
    mine(user: any): Promise<(import("mongoose").FlattenMaps<{
        id: string;
        parent_appointment_id: Types.ObjectId;
        patient_id: Types.ObjectId;
        radiology_center_id: Types.ObjectId;
        delivery_mode: string;
        referring_doctor_id?: string;
        scan_type_code: string;
        scan_name_ar: string;
        scan_name_en: string;
        allocated_machine_id: string;
        status: string;
        clinical_impression_report: string;
        scanned_files_s3_urls: string[];
        signed_report_pdf_url: string;
        report_storage_object_id: string;
        scan_storage_object_ids: string[];
    }> & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getOne(bookingId: string, user: any): Promise<any>;
    allocateMachine(bookingId: string, body: {
        machineId: string;
    }): Promise<{
        success: boolean;
        data: import("mongoose").Document<unknown, {}, RadiologyBooking, {}, {}> & RadiologyBooking & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        message: string;
    }>;
    finalizeScan(bookingId: string, body: {
        reportText: string;
        files: string[];
        pdfUrl: string;
    }): Promise<{
        success: boolean;
        parent_appointment_id: Types.ObjectId;
        message: string;
    }>;
}
