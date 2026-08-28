import { MaternityProfile } from '../../schemas/maternity.schema';
import { MaternityProfileRepository } from "./repositories/maternityprofile.repository";
export declare class MaternityService {
    private readonly model;
    constructor(model: MaternityProfileRepository);
    private calculateCurrentWeek;
    private parseDate;
    private integerInRange;
    private requireProfile;
    getContent(): {
        pregnant_links: any[];
        planning_links: any[];
        weekly_tips: any[];
        planning_tips: any[];
    };
    getProfile(userId: string): Promise<any>;
    updateProfile(userId: string, updateData: any): Promise<any>;
    logKick(userId: string, count: number, durationSeconds: number): Promise<MaternityProfile>;
    logContraction(userId: string, intervalSeconds: number, durationSeconds: number): Promise<MaternityProfile>;
    toggleCheckup(userId: string, checkupWeek: string): Promise<MaternityProfile>;
    logInfantGrowth(userId: string, data: {
        month: number;
        weight_kg?: number;
        height_cm?: number;
        head_circ_cm?: number;
    }): Promise<MaternityProfile>;
}
