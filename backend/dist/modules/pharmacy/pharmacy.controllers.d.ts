import { PharmacyOrderService } from './services/pharmacy-order.service';
import { PharmacyAllocationService } from './services/pharmacy-allocation.service';
import { PharmacyInventoryExtService } from './services/pharmacy-inventory-ext.service';
import { PharmacySeedService } from './services/pharmacy-seed.service';
import { SmartSplitService } from './services/smart-split.service';
import { PharmacyBroadcastService } from './services/pharmacy-broadcast.service';
import { PharmacyChatService } from './services/pharmacy-chat.service';
import { PharmacyShortageService } from './services/pharmacy-shortage.service';
import { PharmacyOrdersProviderService } from './services/pharmacy-orders-provider.service';
import { PharmacyOfferService } from './services/pharmacy-offer.service';
import { PharmacyInsuranceDecisionService } from './services/pharmacy-insurance-decision.service';
import { PharmacyExpiryCommandService } from './services/pharmacy-expiry-command.service';
import { PharmacyPaymentEvidenceService } from './services/pharmacy-payment-evidence.service';
export declare class PatientPharmacyController {
    private orders;
    private offers;
    private insurance;
    private payments;
    constructor(orders: PharmacyOrderService, offers: PharmacyOfferService, insurance: PharmacyInsuranceDecisionService, payments: PharmacyPaymentEvidenceService);
    create(u: any, b: any): Promise<any>;
    list(u: any, status?: string): Promise<any>;
    detail(u: any, id: string): Promise<any>;
    update(u: any, id: string, b: any): Promise<any>;
    submit(u: any, id: string): Promise<any>;
    cancel(u: any, id: string, b: any): Promise<{
        ok: boolean;
    }>;
    paymentIntent(u: any, id: string, b: any): Promise<{
        intent_id: any;
        status: any;
        amount: any;
        currency: any;
        adapter: string;
    }>;
    cancelRejectedInsurance(u: any, id: string, b: any): Promise<any>;
    listOffers(u: any, id: string): Promise<{
        id: any;
        pharmacy_account_id: any;
        version: any;
        items: any;
        totals: any;
        quote_expires_at: any;
        estimated_preparation_minutes: any;
        fulfillment: any;
    }[]>;
    selectOffer(u: any, id: string, offerId: string, b: any): Promise<{
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
}
export declare class ProviderPharmacyController {
    private allocs;
    private inv;
    private providerOrders;
    private insurance;
    constructor(allocs: PharmacyAllocationService, inv: PharmacyInventoryExtService, providerOrders: PharmacyOrdersProviderService, insurance: PharmacyInsuranceDecisionService);
    list(u: any, status?: string): Promise<any>;
    detail(u: any, id: string): Promise<any>;
    itemAction(u: any, id: string, itemId: string, b: any): Promise<any>;
    confirm(u: any, id: string): Promise<any>;
    preparing(u: any, id: string): Promise<any>;
    ready(u: any, id: string): Promise<any>;
    out(u: any, id: string, b: any): Promise<never>;
    delivered(u: any, id: string): Promise<never>;
    updateInsurance(): void;
    insuranceDecision(u: any, id: string, b: any): Promise<any>;
    cancel(u: any, id: string, b: any): Promise<any>;
    acceptOrder(): void;
    submitBasket(): void;
    evaluateInsurance(): void;
    orderPreparing(): void;
    orderReady(): void;
    orderDispatch(): void;
}
export declare class ProviderInventoryExtController {
    private svc;
    constructor(svc: PharmacyInventoryExtService);
    search(u: any, q?: string, bc?: string): Promise<any>;
    restock(u: any, id: string, b: any): Promise<any>;
    alerts(u: any): Promise<any>;
    ack(u: any, id: string): Promise<any>;
}
export declare class AdminPharmacyController {
    private seedSvc;
    private split;
    private allocs;
    private broadcast;
    constructor(seedSvc: PharmacySeedService, split: SmartSplitService, allocs: PharmacyAllocationService, broadcast: PharmacyBroadcastService);
    private assertTestSeedAllowed;
    seed(u: any): Promise<{
        ok: boolean;
        pharmacies: any[];
    }>;
    sampleOrder(u: any, b: any): Promise<any>;
    manualSplit(id: string): Promise<any>;
    expireStale(): Promise<{
        expired: number;
        scanned: any;
    }>;
}
export declare class ProviderBroadcastController {
    private bc;
    private offers;
    constructor(bc: PharmacyBroadcastService, offers: PharmacyOfferService);
    list(u: any): Promise<any>;
    detail(u: any, id: string): Promise<any>;
    previewOffer(u: any, orderId: string, b: any): Promise<{
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
    draftOffer(u: any, orderId: string, b: any): Promise<{
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
    submitOffer(u: any, orderId: string, offerId: string): Promise<{
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
    haveAll(): void;
    havePartial(): void;
    reject(u: any, oid: string, b: any): Promise<any>;
}
export declare class AdminBroadcastController {
    private bc;
    private readonly expiry;
    constructor(bc: PharmacyBroadcastService, expiry: PharmacyExpiryCommandService);
    advance(): void;
    fallback(id: string): Promise<any>;
    expireDue(offerCursor?: string, broadcastCursor?: string, limit?: string): Promise<{
        now: Date;
        scanned_offers: number;
        expired_offers: number;
        scanned_broadcasts: number;
        advanced_rounds: number;
        closed_broadcasts: number;
        recipient_intents: number;
        skipped_claimed: number;
        next_cursor: {
            offer_id?: string;
            broadcast_id?: string;
        } | null;
    }>;
    expireStale(): void;
}
export declare class AdminPharmacyInsuranceController {
    decide(): void;
}
export declare class PharmacyChatController {
    private chat;
    constructor(chat: PharmacyChatService);
    list(u: any, oid?: string): Promise<any>;
    msgs(u: any, id: string): Promise<any>;
    post(u: any, id: string, b: any): Promise<any>;
    accept(u: any, id: string, mid: string): Promise<any>;
    reject(u: any, id: string): Promise<any>;
    remove(u: any, id: string): Promise<any>;
}
export declare class AdminPharmacyChatController {
    private chat;
    constructor(chat: PharmacyChatService);
    sweep(): Promise<any>;
}
export declare class ProviderShortageController {
    private svc;
    constructor(svc: PharmacyShortageService);
    report(u: any, b: any): Promise<any>;
    list(u: any, st?: string): Promise<any>;
}
export declare class AdminShortageController {
    private svc;
    constructor(svc: PharmacyShortageService);
    create(u: any, b: any): Promise<any>;
    list(u: any, st?: string): Promise<any>;
    getDashboard(u: any): Promise<any>;
    markShortage(u: any, medicineId: string, b: any): Promise<any>;
    approve(u: any, id: string): Promise<any>;
    reject(u: any, id: string, b: any): Promise<any>;
    resolve(u: any, id: string): Promise<any>;
}
export declare class PatientShortageController {
    private svc;
    constructor(svc: PharmacyShortageService);
    lookup(sku?: string, gn?: string): Promise<any>;
}
