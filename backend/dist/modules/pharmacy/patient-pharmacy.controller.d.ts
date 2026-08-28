import { PharmacyShortageService } from './services/pharmacy-shortage.service';
export declare class PatientPharmacyController {
    private readonly shortageSvc;
    constructor(shortageSvc: PharmacyShortageService);
    lookupFlags(drugName: string): Promise<{
        flags: any[];
    }>;
}
