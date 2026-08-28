import { Model, Types } from 'mongoose';
import { HospitalBranch } from '../schemas/hospital-branch.schema';
import { HospitalDepartment } from '../schemas/hospital-department.schema';
import { HospitalStaff } from '../schemas/hospital-staff.schema';
import { HospitalInvitation } from '../schemas/hospital-invitation.schema';
import { DoctorProfileExtended } from '../../care/schemas/doctor-profile-extended.schema';
import { User } from '../../../schemas/user.schema';
import { Appointment } from '../../../schemas/appointment.schema';
export declare class HospitalService {
    private branchModel;
    private departmentModel;
    private staffModel;
    private invitationModel;
    private doctorModel;
    private userModel;
    private appointmentModel;
    constructor(branchModel: Model<HospitalBranch>, departmentModel: Model<HospitalDepartment>, staffModel: Model<HospitalStaff>, invitationModel: Model<HospitalInvitation>, doctorModel: Model<DoctorProfileExtended>, userModel: Model<User>, appointmentModel: Model<Appointment>);
    private assertFacilityActor;
    private objectIdForUser;
    private objectId;
    createInvitation(facilityId: string, body: {
        identifier?: string;
        role?: string;
        permissions?: Record<string, boolean>;
    }): Promise<import("mongoose").Document<unknown, {}, HospitalInvitation, {}, {}> & HospitalInvitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    listFacilityInvitations(facilityId: string): Promise<{
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
        _id: Types.ObjectId;
        __v: number;
    }[]>;
    listMyInvitations(userId: string): Promise<{
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
        _id: Types.ObjectId;
        __v: number;
    }[]>;
    respondInvitation(userId: string, invitationId: string, accept: boolean): Promise<import("mongoose").Document<unknown, {}, HospitalInvitation, {}, {}> & HospitalInvitation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    leaveFacility(userId: string): Promise<{
        ok: boolean;
    }>;
    createBranch(hospitalId: string, data: Partial<HospitalBranch>, actor?: any): Promise<import("mongoose").Document<unknown, {}, HospitalBranch, {}, {}> & HospitalBranch & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getBranches(hospitalId: string, actor?: any): Promise<(import("mongoose").Document<unknown, {}, HospitalBranch, {}, {}> & HospitalBranch & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    createDepartment(hospitalId: string, data: Partial<HospitalDepartment>, actor?: any): Promise<import("mongoose").Document<unknown, {}, HospitalDepartment, {}, {}> & HospitalDepartment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getDepartments(hospitalId: string, actor?: any): Promise<(import("mongoose").Document<unknown, {}, HospitalDepartment, {}, {}> & HospitalDepartment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    addStaff(hospitalId: string, data: Partial<HospitalStaff>, actor?: any): Promise<import("mongoose").Document<unknown, {}, HospitalStaff, {}, {}> & HospitalStaff & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getStaff(hospitalId: string, actor?: any): Promise<(import("mongoose").Document<unknown, {}, HospitalStaff, {}, {}> & HospitalStaff & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    onboardDoctor(hospitalId: string, doctorId: string, actor?: any): Promise<import("mongoose").Document<unknown, {}, DoctorProfileExtended, {}, {}> & DoctorProfileExtended & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getUnifiedAppointments(hospitalId: string, branchId?: string, actor?: any): Promise<(import("mongoose").Document<unknown, {}, Appointment, {}, {}> & Appointment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    updateAppointmentStatus(hospitalId: string, appointmentId: string, status: string, actor?: any): Promise<import("mongoose").Document<unknown, {}, Appointment, {}, {}> & Appointment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAggregatedWallet(hospitalId: string, userRole: string, actor?: any): Promise<{
        success: boolean;
        total_revenue: any;
        transactions_count: number;
    }>;
}
