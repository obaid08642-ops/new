import { ProviderAvailabilityStatus } from '../schemas/requests.schema';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
export declare class ProviderDashboardService {
    private requests;
    private avails;
    private accounts;
    private profiles;
    constructor(requests: ProviderRequestRepository, avails: ProviderAvailabilityRepository, accounts: ProviderAccountRepository, profiles: ProviderAccountProfileRepository);
    stats(user: any): Promise<{
        today_requests: any;
        pending_requests: any;
        completed_today: any;
        in_progress: any;
        accepted_total: any;
        today_revenue: any;
        currency: string;
    }>;
    recentRequests(user: any, limit?: number): Promise<{
        items: any;
    }>;
    getAvailability(user: any): Promise<{
        status: any;
        last_online_at: any;
        last_offline_at: any;
        note: any;
    }>;
    setAvailability(user: any, body: {
        status: ProviderAvailabilityStatus;
        note?: string;
    }): Promise<{
        status: any;
        last_online_at: any;
        last_offline_at: any;
        note: any;
    }>;
    me(user: any): Promise<{
        account: {
            id: any;
            email: any;
            provider_type: any;
            status: any;
            email_verified: any;
            approved_at: any;
        };
        profile: any;
        availability: {
            status: any;
            last_online_at: any;
            last_offline_at: any;
            note: any;
        };
    }>;
}
