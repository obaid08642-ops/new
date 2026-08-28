import { PharmacyExpiryCommandService } from './pharmacy-expiry-command.service';
export declare class PharmacyExpiryScheduler {
    private readonly expiry;
    private readonly logger;
    constructor(expiry: PharmacyExpiryCommandService);
    sweep(): Promise<void>;
}
