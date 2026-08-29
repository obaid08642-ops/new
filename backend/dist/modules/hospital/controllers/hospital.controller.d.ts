import { HospitalService } from '../services/hospital.service';
export declare class HospitalController {
    private readonly hospitalService;
    constructor(hospitalService: HospitalService);
    createBranch(user: any, body: any): Promise<import("mongoose").Document<unknown, {}, import("../schemas/hospital-branch.schema").HospitalBranch, {}, {}> & import("../schemas/hospital-branch.schema").HospitalBranch & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getBranches(user: any): Promise<(import("mongoose").Document<unknown, {}, import("../schemas/hospital-branch.schema").HospitalBranch, {}, {}> & import("../schemas/hospital-branch.schema").HospitalBranch & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    createDepartment(user: any, body: any): Promise<import("mongoose").Document<unknown, {}, import("../schemas/hospital-department.schema").HospitalDepartment, {}, {}> & import("../schemas/hospital-department.schema").HospitalDepartment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getDepartments(user: any): Promise<(import("mongoose").Document<unknown, {}, import("../schemas/hospital-department.schema").HospitalDepartment, {}, {}> & import("../schemas/hospital-department.schema").HospitalDepartment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    addStaff(user: any, body: any): Promise<import("mongoose").Document<unknown, {}, import("../schemas/hospital-staff.schema").HospitalStaff, {}, {}> & import("../schemas/hospital-staff.schema").HospitalStaff & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getStaff(user: any): Promise<(import("mongoose").Document<unknown, {}, import("../schemas/hospital-staff.schema").HospitalStaff, {}, {}> & import("../schemas/hospital-staff.schema").HospitalStaff & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    onboardDoctor(user: any, body: {
        doctor_id: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../../care/schemas/doctor-profile-extended.schema").DoctorProfileExtended, {}, {}> & import("../../care/schemas/doctor-profile-extended.schema").DoctorProfileExtended & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAppointments(user: any, branchId?: string): Promise<(import("mongoose").Document<unknown, {}, import("../../../schemas/appointment.schema").Appointment, {}, {}> & import("../../../schemas/appointment.schema").Appointment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    updateAppointmentStatus(user: any, id: string, body: {
        status: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../../../schemas/appointment.schema").Appointment, {}, {}> & import("../../../schemas/appointment.schema").Appointment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getWallet(user: any): Promise<{
        success: boolean;
        total_revenue: any;
        transactions_count: number;
    }>;
    createInvitation(user: any, body: {
        identifier?: string;
        role?: string;
        permissions?: Record<string, boolean>;
    }): Promise<import("mongoose").Document<unknown, {}, import("../schemas/hospital-invitation.schema").HospitalInvitation, {}, {}> & import("../schemas/hospital-invitation.schema").HospitalInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    listFacilityInvitations(user: any): Promise<{
        invitee_name: any;
        id: string;
        facility_id: string;
        invitee_id: string;
        invitee_identifier: string;
        role: string;
        permissions: import("mongoose").FlattenMaps<{
            [x: string]: boolean;
        }>;
        status: string;
        responded_at?: Date;
        _id: import("mongoose").Types.ObjectId;
        __v: number;
    }[]>;
    listMyInvitations(user: any): Promise<{
        facility_name: any;
        id: string;
        facility_id: string;
        invitee_id: string;
        invitee_identifier: string;
        role: string;
        permissions: import("mongoose").FlattenMaps<{
            [x: string]: boolean;
        }>;
        status: string;
        responded_at?: Date;
        _id: import("mongoose").Types.ObjectId;
        __v: number;
    }[]>;
    respondInvitation(user: any, id: string, body: {
        accept?: boolean;
    }): Promise<import("mongoose").Document<unknown, {}, import("../schemas/hospital-invitation.schema").HospitalInvitation, {}, {}> & import("../schemas/hospital-invitation.schema").HospitalInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    leaveFacility(user: any): Promise<{
        ok: boolean;
    }>;
}
