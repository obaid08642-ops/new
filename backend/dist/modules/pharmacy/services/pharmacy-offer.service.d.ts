import { Connection, Model } from 'mongoose';
import { EventBusService } from '../../events/event-bus.service';
type ProviderOfferItemInput = {
    order_item_id: string;
    availability: 'available' | 'unavailable' | 'substitute';
    qty_offered?: number;
    inventory_item_id?: string;
    substitute_inventory_item_id?: string;
};
type ProviderOfferInput = {
    items: ProviderOfferItemInput[];
    delivery_option?: 'delivery' | 'pickup';
    eta_minutes?: number;
};
export declare class PharmacyOfferService {
    private readonly connection;
    private readonly offers;
    private readonly orders;
    private readonly allocations;
    private readonly broadcasts;
    private readonly inventory;
    private readonly accounts;
    private readonly bus;
    constructor(connection: Connection, offers: Model<any>, orders: Model<any>, allocations: Model<any>, broadcasts: Model<any>, inventory: Model<any>, accounts: Model<any>, bus: EventBusService);
    private assertActivePharmacy;
    private loadBroadcastForPharmacy;
    private inventoryForOffer;
    private serverQuote;
    previewQuote(user: any, orderId: string, body: ProviderOfferInput): Promise<{
        quote_ttl_seconds: number;
        quote_generated_at: Date;
        delivery_client_fields_ignored: boolean;
        items: any[];
        totals: {
            subtotal: number;
            delivery_fee: number;
            total: number;
            currency: string;
        };
        estimated_preparation_minutes: number;
        fulfillment: {
            policy_status: string;
            delivery_option: any;
            eta_minutes: any;
            delivery_fee_source: string;
        };
    }>;
    upsertDraft(user: any, orderId: string, body: ProviderOfferInput): Promise<{
        id: any;
        order_id: any;
        status: any;
        version: any;
        items: any;
        totals: any;
        quote_expires_at: any;
        estimated_preparation_minutes: any;
        fulfillment: any;
        pricing_source: any;
    }>;
    submitDraft(user: any, orderId: string, offerId: string): Promise<{
        id: any;
        order_id: any;
        status: any;
        version: any;
        items: any;
        totals: any;
        quote_expires_at: any;
        estimated_preparation_minutes: any;
        fulfillment: any;
        pricing_source: any;
    }>;
    listForPatient(user: any, orderId: string): Promise<{
        id: any;
        pharmacy_account_id: any;
        version: any;
        items: any;
        totals: any;
        quote_expires_at: any;
        estimated_preparation_minutes: any;
        fulfillment: any;
    }[]>;
    selectByPatient(user: any, orderId: string, offerId: string, idempotencyKey: string): Promise<{
        offer: {
            id: any;
            pharmacy_account_id: any;
            version: any;
            items: any;
            totals: any;
            quote_expires_at: any;
            estimated_preparation_minutes: any;
            fulfillment: any;
        };
        allocation_id: any;
        next_status: any;
    }>;
    private providerDto;
    private patientDto;
}
export {};
