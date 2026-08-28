import { Model, Types } from 'mongoose';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';
export declare class RadiologyProviderController {
    private radBookingModel;
    private radServiceModel;
    private radMachineModel;
    private userModel;
    constructor(radBookingModel: Model<RadiologyBooking>, radServiceModel: Model<any>, radMachineModel: Model<any>, userModel: Model<any>);
    private centerFor;
    private isAdmin;
    private assertBookingAccess;
    getProviderQueue(_providerId: string, user: any): Promise<(import("mongoose").FlattenMaps<{
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
    respondBooking(bookingId: string, body: {
        accept: boolean;
    }, user: any): Promise<{
        success: boolean;
        status: string;
    }>;
    allocateMachine(bookingId: string, body: {
        machineId: string;
    }, user: any): Promise<{
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
    }, user: any): Promise<{
        success: boolean;
        referring_doctor_id: string;
        message: string;
    }>;
    getWallet(_providerId: string, user: any): Promise<{
        grossRevenue: number;
        insuranceClaims: number;
        deductedCommissions: number;
        transactions: any[];
    }>;
    getCatalog(_providerId: string): Promise<any[]>;
    updateCatalogItem(serviceId: string, body: any, user: any): Promise<any>;
    getInventory(_providerId: string, user: any): Promise<any[]>;
    addMachine(body: any, user: any): Promise<any>;
}
