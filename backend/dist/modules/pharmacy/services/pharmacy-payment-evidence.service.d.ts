import { Connection } from 'mongoose';
export declare class PharmacyPaymentEvidenceService {
    private readonly conn;
    constructor(conn: Connection);
    createPaymentIntent(user: any, orderId: string, idempotencyKey: string): Promise<{
        intent_id: any;
        status: any;
        amount: any;
        currency: any;
        adapter: string;
    }>;
    onMoyasarPaid(payload: any): Promise<{
        recorded: boolean;
        idempotent: boolean;
        order_id: string;
        gateway_payment_id: string;
    }>;
    recordVerifiedGatewayPayment(gateway: string, payload: any): Promise<{
        recorded: boolean;
        idempotent: boolean;
        order_id: string;
        gateway_payment_id: string;
    }>;
}
