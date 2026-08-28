import { PatientProfileRepository } from './repositories/patient-profile.repository';
export declare class UserInsuranceController {
    private readonly patientProfileRepo;
    constructor(patientProfileRepo: PatientProfileRepository);
    getInsurance(user: any): Promise<{
        policies: any;
    }>;
}
