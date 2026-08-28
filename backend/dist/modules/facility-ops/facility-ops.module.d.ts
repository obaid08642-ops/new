import { Model, Connection } from 'mongoose';
import { Ward, WardDocument, BedDocument, Admission, AdmissionDocument, Shift, ShiftDocument, Attendance, AttendanceDocument, SurgeryBooking, SurgeryBookingDocument } from '../../schemas/hospital-operations.schema';
export declare class BedsService {
    private wardModel;
    private bedModel;
    private admissionModel;
    private readonly conn;
    constructor(wardModel: Model<WardDocument>, bedModel: Model<BedDocument>, admissionModel: Model<AdmissionDocument>, conn: Connection);
    listAdmissions(facilityId: string, status?: string): Promise<{
        id: any;
        patient_id: any;
        patient_name: string;
        bed_id: any;
        admitted_at: any;
        discharged_at: any;
        status: any;
        discharge_summary: any;
    }[]>;
    listWards(facilityId: string): Promise<(import("mongoose").FlattenMaps<WardDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getWardBeds(wardId: string): Promise<(import("mongoose").FlattenMaps<BedDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    createWard(facilityId: string, name: string, totalBeds: number): Promise<import("mongoose").Document<unknown, {}, WardDocument, {}, {}> & Ward & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    admitPatient(facilityId: string, patientId: string, bedId: string): Promise<import("mongoose").Document<unknown, {}, AdmissionDocument, {}, {}> & Admission & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    dischargePatient(facilityId: string, admissionId: string, summary?: {
        diagnosis?: string;
        medications?: string;
        instructions?: string;
    }): Promise<{
        ok: boolean;
    }>;
}
export declare class ShiftsService {
    private shiftModel;
    private attendanceModel;
    constructor(shiftModel: Model<ShiftDocument>, attendanceModel: Model<AttendanceDocument>);
    listShifts(facilityId: string): Promise<(import("mongoose").FlattenMaps<ShiftDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    createShift(facilityId: string, body: {
        user_id: string;
        department_id?: string;
        start_time: string;
        end_time: string;
        day_of_week: string;
    }): Promise<import("mongoose").Document<unknown, {}, ShiftDocument, {}, {}> & Shift & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    requestSubstitute(facilityId: string, shiftId: string): Promise<{
        ok: boolean;
    }>;
    updateShift(facilityId: string, shiftId: string, body: Record<string, unknown>): Promise<import("mongoose").FlattenMaps<ShiftDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    deleteShift(facilityId: string, shiftId: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    checkIn(facilityId: string, userId: string, lat?: number, lng?: number): Promise<import("mongoose").Document<unknown, {}, AttendanceDocument, {}, {}> & Attendance & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    checkOut(facilityId: string, attendanceId: string): Promise<{
        ok: boolean;
    }>;
    getAttendance(facilityId: string): Promise<(import("mongoose").FlattenMaps<AttendanceDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class SurgeriesService {
    private surgeryModel;
    constructor(surgeryModel: Model<SurgeryBookingDocument>);
    bookSurgery(facilityId: string, body: {
        patient_id: string;
        primary_surgeon_id: string;
        assistants?: string[];
        ot_room_number: string;
        scheduled_at: Date;
        duration_mins: number;
    }): Promise<import("mongoose").Document<unknown, {}, SurgeryBookingDocument, {}, {}> & SurgeryBooking & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    listSurgeries(facilityId: string): Promise<(import("mongoose").FlattenMaps<SurgeryBookingDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class FacilityBedsController {
    private svc;
    constructor(svc: BedsService);
    listWards(u: any): Promise<(import("mongoose").FlattenMaps<WardDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getWardBeds(wardId: string): Promise<(import("mongoose").FlattenMaps<BedDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    createWard(u: any, b: {
        name: string;
        total_beds: number;
    }): Promise<import("mongoose").Document<unknown, {}, WardDocument, {}, {}> & Ward & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    admit(u: any, b: {
        patient_id: string;
        bed_id: string;
    }): Promise<import("mongoose").Document<unknown, {}, AdmissionDocument, {}, {}> & Admission & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    admissions(u: any): Promise<{
        id: any;
        patient_id: any;
        patient_name: string;
        bed_id: any;
        admitted_at: any;
        discharged_at: any;
        status: any;
        discharge_summary: any;
    }[]>;
    discharge(u: any, id: string, b?: {
        diagnosis?: string;
        medications?: string;
        instructions?: string;
    }): Promise<{
        ok: boolean;
    }>;
}
export declare class FacilityShiftsController {
    private svc;
    constructor(svc: ShiftsService);
    listShifts(u: any): Promise<(import("mongoose").FlattenMaps<ShiftDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    createShift(u: any, b: any): Promise<import("mongoose").Document<unknown, {}, ShiftDocument, {}, {}> & Shift & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    substitute(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    updateShift(u: any, id: string, b: Record<string, unknown>): Promise<import("mongoose").FlattenMaps<ShiftDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    deleteShift(u: any, id: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    checkIn(u: any, b: {
        lat?: number;
        lng?: number;
    }): Promise<import("mongoose").Document<unknown, {}, AttendanceDocument, {}, {}> & Attendance & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    checkOut(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    getAttendance(u: any): Promise<(import("mongoose").FlattenMaps<AttendanceDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class FacilitySurgeriesController {
    private svc;
    constructor(svc: SurgeriesService);
    book(u: any, b: any): Promise<import("mongoose").Document<unknown, {}, SurgeryBookingDocument, {}, {}> & SurgeryBooking & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    list(u: any): Promise<(import("mongoose").FlattenMaps<SurgeryBookingDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class FacilityCommsController {
    private readonly conn;
    constructor(conn: Connection);
    private fid;
    listAnnouncements(u: any): Promise<any[]>;
    createAnnouncement(u: any, b: any): Promise<any>;
    listResources(u: any): Promise<any[]>;
    createResource(u: any, b: any): Promise<any>;
    updateResource(u: any, id: string, b: any): Promise<any>;
}
export declare class FacilityOpsModule {
}
