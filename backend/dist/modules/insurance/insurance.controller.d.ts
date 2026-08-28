import { Model } from 'mongoose';
import { InsuranceService } from './insurance.module';
export declare class InsuranceController {
    private profileModel;
    private readonly insuranceService;
    constructor(profileModel: Model<any>, insuranceService: InsuranceService);
    getActivePolicies(req: any): Promise<{
        policies: any[];
    }>;
    listCompanies(): Promise<any[]>;
}
