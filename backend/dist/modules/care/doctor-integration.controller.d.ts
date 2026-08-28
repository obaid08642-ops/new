import { Model, Types } from 'mongoose';
import { DoctorProfileExtended } from './schemas/doctor-profile-extended.schema';
import { EncounterRecord } from './schemas/encounter-record.schema';
export declare class DoctorIntegrationController {
    private doctorProfileModel;
    private encounterModel;
    constructor(doctorProfileModel: Model<DoctorProfileExtended>, encounterModel: Model<EncounterRecord>);
    synchronizeSettings(payload: any): Promise<{
        success: boolean;
        payload: import("mongoose").Document<unknown, {}, DoctorProfileExtended, {}, {}> & DoctorProfileExtended & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    finalizeEncounter(encounterDto: any): Promise<{
        success: boolean;
        reference_token: Types.ObjectId;
    }>;
}
