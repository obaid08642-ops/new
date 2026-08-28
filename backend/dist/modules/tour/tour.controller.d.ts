import { TourService } from './tour.service';
export declare class TourController {
    private tourSvc;
    constructor(tourSvc: TourService);
    getStatus(userId: string): Promise<any>;
    completeStep(userId: string, stepId: string): Promise<{
        ok: boolean;
    }>;
}
