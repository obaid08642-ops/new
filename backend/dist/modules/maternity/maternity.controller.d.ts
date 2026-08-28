import { MaternityService } from './maternity.service';
export declare class MaternityController {
    private readonly maternityService;
    constructor(maternityService: MaternityService);
    private authenticatedPatientId;
    getProfile(req: any): Promise<any>;
    getContent(): {
        pregnant_links: any[];
        planning_links: any[];
        weekly_tips: any[];
        planning_tips: any[];
    };
    updateProfile(req: any, body: any): Promise<any>;
    logKick(req: any, body: {
        count: number;
        duration_seconds: number;
    }): Promise<import("../../schemas/maternity.schema").MaternityProfile>;
    logContraction(req: any, body: {
        interval_seconds: number;
        duration_seconds: number;
    }): Promise<import("../../schemas/maternity.schema").MaternityProfile>;
    toggleCheckup(req: any, week: string): Promise<import("../../schemas/maternity.schema").MaternityProfile>;
    logInfantGrowth(req: any, body: {
        month: number;
        weight_kg?: number;
        height_cm?: number;
        head_circ_cm?: number;
    }): Promise<import("../../schemas/maternity.schema").MaternityProfile>;
}
