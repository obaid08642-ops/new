import { Model } from 'mongoose';
export declare class TourService {
    private userModel;
    private readonly logger;
    constructor(userModel: Model<any>);
    getUserTourStatus(userId: string): Promise<any>;
    markStepComplete(userId: string, stepId: string): Promise<{
        ok: boolean;
    }>;
}
