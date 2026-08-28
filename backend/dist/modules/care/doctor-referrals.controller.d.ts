import { Model, Types, Connection } from 'mongoose';
import { EncounterReferral } from './schemas/encounter-referrals.schema';
import { DoctorProfileExtended } from './schemas/doctor-profile-extended.schema';
export declare class DoctorReferralsController {
    private referralModel;
    private doctorProfileModel;
    private readonly conn;
    constructor(referralModel: Model<EncounterReferral>, doctorProfileModel: Model<DoctorProfileExtended>, conn: Connection);
    private assertDoctorOwnership;
    myReferrals(req: any, doctorId: string): Promise<{
        id: string;
        type: string;
        patientName: string;
        labTests: any;
        radScans: any;
        homeCareNotes: any;
        status: string;
        date: string;
        fileUrls: any;
    }[]>;
    issueReferralsAndPrescription(req: any, payload: any): Promise<{
        success: boolean;
        message: string;
        referral_id: Types.ObjectId;
        routing_mode: string;
    }>;
    diagnosticCallback(appointmentId: string, body: {
        fileUrls: string[];
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
