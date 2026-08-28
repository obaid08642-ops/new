import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
export declare class ProviderScheduleService {
    private requests;
    constructor(requests: ProviderRequestRepository);
    view(user: any, q: {
        mode?: string;
        from?: string;
    }): Promise<{
        mode: string;
        from: Date;
        to: Date;
        count: any;
        days: Record<string, any[]>;
    }>;
}
