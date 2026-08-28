import { ReturnsService } from './returns.service';
export declare class ReturnsController {
    private readonly returnsService;
    constructor(returnsService: ReturnsService);
    create(user: any, body: any): Promise<any>;
    list(user: any): Promise<any>;
    providerList(user: any): Promise<any[]>;
    eligibility(orderId: string, user: any): Promise<{
        order_id: string;
        delivered: boolean;
        within_window: boolean;
        window_days: number;
        eligible: any;
        items: any;
    }>;
    getDetails(id: string, user: any): Promise<any>;
    decide(id: string, body: {
        decision: 'approved' | 'rejected';
        note?: string;
    }, adminUser: any): Promise<any>;
}
