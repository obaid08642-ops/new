import { Document } from 'mongoose';
export declare class Ward {
    id: string;
    facility_id: string;
    name: string;
    total_beds: number;
    available_beds: number;
}
export type WardDocument = Ward & Document;
export declare const WardSchema: import("mongoose").Schema<Ward, import("mongoose").Model<Ward, any, any, any, Document<unknown, any, Ward, any, {}> & Ward & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Ward, Document<unknown, {}, import("mongoose").FlatRecord<Ward>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Ward> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Bed {
    id: string;
    ward_id: string;
    bed_number: string;
    type: 'general' | 'icu' | 'ccu';
    status: 'available' | 'occupied' | 'reserved';
    occupied_by_patient_id?: string;
}
export type BedDocument = Bed & Document;
export declare const BedSchema: import("mongoose").Schema<Bed, import("mongoose").Model<Bed, any, any, any, Document<unknown, any, Bed, any, {}> & Bed & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Bed, Document<unknown, {}, import("mongoose").FlatRecord<Bed>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Bed> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Admission {
    id: string;
    patient_id: string;
    facility_id: string;
    bed_id: string;
    admitted_at: Date;
    discharged_at?: Date;
    status: 'active' | 'discharged';
    discharge_summary?: {
        diagnosis?: string;
        medications?: string;
        instructions?: string;
        created_at?: Date;
    };
}
export type AdmissionDocument = Admission & Document;
export declare const AdmissionSchema: import("mongoose").Schema<Admission, import("mongoose").Model<Admission, any, any, any, Document<unknown, any, Admission, any, {}> & Admission & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Admission, Document<unknown, {}, import("mongoose").FlatRecord<Admission>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Admission> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Shift {
    id: string;
    user_id: string;
    facility_id: string;
    department_id?: string;
    start_time: string;
    end_time: string;
    day_of_week: string;
    status: 'scheduled' | 'substitute' | 'cancelled';
}
export type ShiftDocument = Shift & Document;
export declare const ShiftSchema: import("mongoose").Schema<Shift, import("mongoose").Model<Shift, any, any, any, Document<unknown, any, Shift, any, {}> & Shift & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Shift, Document<unknown, {}, import("mongoose").FlatRecord<Shift>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Shift> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Attendance {
    id: string;
    user_id: string;
    facility_id: string;
    check_in_time: Date;
    check_out_time?: Date;
    location_lat?: number;
    location_lng?: number;
    status: 'present' | 'absent' | 'late' | 'excused';
}
export type AttendanceDocument = Attendance & Document;
export declare const AttendanceSchema: import("mongoose").Schema<Attendance, import("mongoose").Model<Attendance, any, any, any, Document<unknown, any, Attendance, any, {}> & Attendance & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Attendance, Document<unknown, {}, import("mongoose").FlatRecord<Attendance>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Attendance> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class SurgeryBooking {
    id: string;
    facility_id: string;
    patient_id: string;
    primary_surgeon_id: string;
    assistants: string[];
    ot_room_number: string;
    scheduled_at: Date;
    duration_mins: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
export type SurgeryBookingDocument = SurgeryBooking & Document;
export declare const SurgeryBookingSchema: import("mongoose").Schema<SurgeryBooking, import("mongoose").Model<SurgeryBooking, any, any, any, Document<unknown, any, SurgeryBooking, any, {}> & SurgeryBooking & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SurgeryBooking, Document<unknown, {}, import("mongoose").FlatRecord<SurgeryBooking>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SurgeryBooking> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
