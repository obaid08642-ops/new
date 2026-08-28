export declare class UnifiedBookingsService {
    private redisClient;
    constructor();
    acquireBookingLock(providerId: string, slotStartTimestamp: number, patientId: string): Promise<void>;
    releaseBookingLock(providerId: string, slotStartTimestamp: number): Promise<void>;
}
