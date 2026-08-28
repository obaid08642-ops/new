import { Model, Types } from 'mongoose';
import { HospitalSubEntity } from '../schemas/hospital-sub-entity.schema';
import { User } from '../../../schemas/user.schema';
import { Appointment } from '../../../schemas/appointment.schema';
import { ProviderProfile } from '../../../schemas/provider-profile.schema';
export declare class HospitalEnterpriseController {
    private subEntityModel;
    private userModel;
    private appointmentModel;
    private providerModel;
    constructor(subEntityModel: Model<HospitalSubEntity>, userModel: Model<User>, appointmentModel: Model<Appointment>, providerModel: Model<ProviderProfile>);
    provisionSubProvider(payload: any): Promise<{
        success: boolean;
        binding_id: Types.ObjectId;
        message: string;
    }>;
    getBranchStaff(hospitalId: string, branchId: string): Promise<{
        success: boolean;
        staff: {
            id: Types.ObjectId;
            entity_type: string;
            user: Types.ObjectId;
        }[];
    }>;
    getBranchFinancials(hospitalId: string, branchId: string, securityContext: {
        requestorId: string;
    }): Promise<{
        success: boolean;
        branch_id: string;
        metrics: {
            total_escrow_claims: number;
            cash_collected_sar: number;
            consolidated_wallet_balance: number;
        };
    }>;
}
