import { Connection, Model } from 'mongoose';
import { PharmacyBroadcastService } from './pharmacy-broadcast.service';
type ExpiryCursor = {
    offer_id?: string;
    broadcast_id?: string;
};
type CommandResult = {
    now: Date;
    scanned_offers: number;
    expired_offers: number;
    scanned_broadcasts: number;
    advanced_rounds: number;
    closed_broadcasts: number;
    recipient_intents: number;
    skipped_claimed: number;
    next_cursor: ExpiryCursor | null;
};
export declare class PharmacyExpiryCommandService {
    private readonly connection;
    private readonly offers;
    private readonly broadcasts;
    private readonly orders;
    private readonly broadcastService;
    constructor(connection: Connection, offers: Model<any>, broadcasts: Model<any>, orders: Model<any>, broadcastService: PharmacyBroadcastService);
    private limit;
    private modified;
    private claimFilter;
    private withTransaction;
    private upsertOutbox;
    private expireOffer;
    private createRecipientIntent;
    private closeBroadcast;
    private expireBroadcast;
    expireDuePharmacyOffers(now?: Date, cursor?: ExpiryCursor, requestedLimit?: number): Promise<CommandResult>;
}
export {};
