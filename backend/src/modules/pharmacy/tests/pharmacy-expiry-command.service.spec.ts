import { ServiceUnavailableException } from '@nestjs/common';
import { PharmacyExpiryCommandService } from '../services/pharmacy-expiry-command.service';

const lean = (value: any) => ({ lean: jest.fn().mockResolvedValue(value) });
const scan = (value: any[]) => ({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue(lean(value)) }) });

describe('PharmacyExpiryCommandService', () => {
  const now = new Date('2026-08-27T10:00:00.000Z');
  const expiredOffer = { id: 'offer-1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', version: 2, quote_expires_at: new Date('2026-08-27T09:59:00.000Z') };
  const dueBroadcast = { id: 'broadcast-1', order_id: 'order-1', current_round: 1, current_radius_km: 3, lock_state: 'open', notified_pharmacies: ['pharmacy-1'], round_expires_at: new Date('2026-08-27T09:59:00.000Z') };
  const stages = [{ stage: 1, radius_km: 3, timeout_seconds: 90 }, { stage: 2, radius_km: 5, timeout_seconds: 90 }, { stage: 3, radius_km: 10, timeout_seconds: 90 }];

  function setup(options: { offers?: any[]; broadcasts?: any[]; offerClaim?: any; broadcastClaim?: any; eligible?: any[]; stagesError?: Error; recipientDuplicate?: boolean; outboxDuplicate?: boolean; liveOffers?: number; stopAfter?: number } = {}) {
    const outbox = { updateOne: jest.fn().mockImplementation(async () => { if (options.outboxDuplicate) { const error: any = new Error('duplicate'); error.code = 11000; throw error; } return { upsertedCount: 1 }; }) };
    const recipients = { updateOne: jest.fn().mockResolvedValue(options.recipientDuplicate ? { matchedCount: 1, upsertedCount: 0 } : { upsertedCount: 1 }) };
    const session = { withTransaction: jest.fn(async (work) => work(session)), endSession: jest.fn().mockResolvedValue(undefined) };
    const connection: any = {
      startSession: jest.fn().mockResolvedValue(session),
      collection: jest.fn((name: string) => name === 'domain_outbox' ? outbox : name === 'pharmacy_broadcast_recipients' ? recipients : { updateOne: jest.fn() }),
    };
    const offers: any = { find: jest.fn(() => scan(options.offers ?? [])), findOneAndUpdate: jest.fn(() => lean(options.offerClaim === undefined ? expiredOffer : options.offerClaim)), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }), countDocuments: jest.fn().mockResolvedValue(options.liveOffers ?? 0) };
    const broadcasts: any = { find: jest.fn(() => scan(options.broadcasts ?? [])), findOneAndUpdate: jest.fn(() => lean(options.broadcastClaim === undefined ? dueBroadcast : options.broadcastClaim)), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    const orders: any = { findOne: jest.fn(() => lean({ id: 'order-1', delivery_address: { geo: { lat: 24.7, lng: 46.7 } } })), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    const broadcastService: any = {
      getBroadcastStages: jest.fn().mockImplementation(async () => { if (options.stagesError) throw options.stagesError; return stages; }),
      getStopAfterOffers: jest.fn().mockResolvedValue(options.stopAfter ?? 3),
      findEligiblePharmaciesWithin: jest.fn().mockResolvedValue(options.eligible ?? [{ account_id: 'pharmacy-2' }]),
    };
    const pharmacyNotif: any = { notifyPatientOrderAutoCancelled: jest.fn().mockResolvedValue(undefined) };
    return { service: new PharmacyExpiryCommandService(connection, offers, broadcasts, orders, broadcastService, pharmacyNotif), connection, offers, broadcasts, orders, outbox, recipients, broadcastService, session };
  }

  it('expires only due draft/submitted quotes using a lease claim and transactionally records the idempotent intent', async () => {
    const { service, offers, outbox, session } = setup({ offers: [expiredOffer], broadcasts: [] });
    const result = await service.expireDuePharmacyOffers(now);
    expect(result).toEqual(expect.objectContaining({ scanned_offers: 1, expired_offers: 1, scanned_broadcasts: 0, skipped_claimed: 0, next_cursor: null }));
    expect(offers.find).toHaveBeenCalledWith(expect.objectContaining({ status: { $in: ['draft', 'submitted'] } }));
    expect(offers.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'offer-1', quote_expires_at: { $lte: now } }), expect.anything(), { new: true });
    expect(offers.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'offer-1', 'expiry_claim.token': expect.any(String) }), expect.objectContaining({ $set: expect.objectContaining({ status: 'expired' }) }), { session });
    expect(outbox.updateOne).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'pharmacy.offer.expired', idempotency_key: 'pharmacy-offer-expired:offer-1:2' }), expect.anything(), expect.objectContaining({ upsert: true, session }));
  });

  it('skips a live competing lease and accepts E11000 from the durable outbox as an idempotent replay', async () => {
    const claimed = setup({ offers: [expiredOffer], broadcasts: [], offerClaim: null });
    const skipped = await claimed.service.expireDuePharmacyOffers(now);
    expect(skipped).toEqual(expect.objectContaining({ expired_offers: 0, skipped_claimed: 1 }));
    expect(claimed.offers.updateOne).not.toHaveBeenCalled();
    const duplicate = setup({ offers: [expiredOffer], broadcasts: [], outboxDuplicate: true });
    await expect(duplicate.service.expireDuePharmacyOffers(now)).resolves.toEqual(expect.objectContaining({ expired_offers: 1 }));
  });

  it('advances to a validated next round, atomically adds only new recipients, and writes unique recipient intents without allocation', async () => {
    const { service, broadcasts, orders, outbox, recipients, broadcastService } = setup({ offers: [], broadcasts: [dueBroadcast], eligible: [{ account_id: 'pharmacy-1' }, { account_id: 'pharmacy-2' }] });
    const result = await service.expireDuePharmacyOffers(now);
    expect(result).toEqual(expect.objectContaining({ scanned_broadcasts: 1, advanced_rounds: 1, closed_broadcasts: 0, recipient_intents: 1 }));
    expect(broadcastService.findEligiblePharmaciesWithin).toHaveBeenCalledWith({ lat: 24.7, lng: 46.7 }, 5, { extended: false });
    expect(recipients.updateOne).toHaveBeenCalledWith({ broadcast_id: 'broadcast-1', pharmacy_account_id: 'pharmacy-2' }, expect.anything(), expect.objectContaining({ upsert: true }));
    expect(broadcasts.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'broadcast-1', 'expiry_claim.token': expect.any(String) }), expect.objectContaining({ $set: expect.objectContaining({ current_round: 2 }), $addToSet: { notified_pharmacies: { $each: ['pharmacy-2'] } } }), expect.anything());
    expect(orders.updateOne).not.toHaveBeenCalled();
    expect(outbox.updateOne).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'pharmacy.broadcast.recipient_added' }), expect.anything(), expect.anything());
  });

  it('does not duplicate recipients or intents on replay, and closes into manual review when validated policy is unavailable', async () => {
    const replay = setup({ offers: [], broadcasts: [dueBroadcast], recipientDuplicate: true });
    const replayResult = await replay.service.expireDuePharmacyOffers(now);
    expect(replayResult.recipient_intents).toBe(0);
    expect(replay.broadcasts.updateOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ $addToSet: { notified_pharmacies: { $each: [] } } }), expect.anything());

    const missingPolicy = setup({ offers: [], broadcasts: [dueBroadcast], stagesError: new ServiceUnavailableException('validated_pharmacy_broadcast_policy_required') });
    const closed = await missingPolicy.service.expireDuePharmacyOffers(now);
    expect(closed).toEqual(expect.objectContaining({ closed_broadcasts: 1, advanced_rounds: 0 }));
    expect(missingPolicy.orders.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'order-1' }), expect.objectContaining({ $set: { status: 'manual_review' } }), expect.anything());
  });

  it('closes the final elapsed round into manual review without allocation or recipient delivery', async () => {
    const finalRound = { ...dueBroadcast, current_round: 4, current_radius_km: 10, extended_stage: true };
    const { service, broadcasts, orders, broadcastService } = setup({ offers: [], broadcasts: [finalRound], broadcastClaim: finalRound });
    const result = await service.expireDuePharmacyOffers(now);
    expect(result).toEqual(expect.objectContaining({ closed_broadcasts: 1, advanced_rounds: 0, recipient_intents: 0 }));
    expect(broadcastService.findEligiblePharmaciesWithin).not.toHaveBeenCalled();
    expect(broadcasts.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'broadcast-1' }), expect.objectContaining({ $set: { lock_state: 'closed' } }), expect.anything());
    expect(orders.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'order-1', $or: expect.any(Array) }), expect.objectContaining({ $set: { status: 'manual_review' } }), expect.anything());
  });

  it('runs one extended stage after the final standard round instead of closing (own-delivery radius)', async () => {
    const lastStandard = { ...dueBroadcast, current_round: 3, current_radius_km: 10 };
    const { service, broadcasts, broadcastService } = setup({ offers: [], broadcasts: [lastStandard], broadcastClaim: lastStandard });
    const result = await service.expireDuePharmacyOffers(now);
    expect(result).toEqual(expect.objectContaining({ advanced_rounds: 1, closed_broadcasts: 0 }));
    // Fixture order has no pickup flag → extended own-delivery stage at the last standard radius.
    expect(broadcastService.findEligiblePharmaciesWithin).toHaveBeenCalledWith({ lat: 24.7, lng: 46.7 }, 10, { extended: true });
    expect(broadcasts.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'broadcast-1' }),
      expect.objectContaining({ $set: expect.objectContaining({ current_round: 4, current_radius_km: 10, extended_stage: true }) }), expect.anything());
  });

  it('stops widening once enough live offers exist: no new round, no recipients, no close; the round is re-checked later', async () => {
    const { service, broadcasts, orders, broadcastService, offers } = setup({ offers: [], broadcasts: [dueBroadcast], liveOffers: 3, stopAfter: 3 });
    const result = await service.expireDuePharmacyOffers(now);
    expect(result).toEqual(expect.objectContaining({ advanced_rounds: 0, closed_broadcasts: 0, recipient_intents: 0 }));
    expect(offers.countDocuments).toHaveBeenCalledWith({ order_id: 'order-1', status: 'submitted', quote_expires_at: { $gt: now } });
    expect(broadcastService.findEligiblePharmaciesWithin).not.toHaveBeenCalled();
    expect(orders.updateOne).not.toHaveBeenCalled();
    const update = broadcasts.updateOne.mock.calls[0][1];
    expect(update.$set.current_round).toBeUndefined();
    expect(update.$set.round_expires_at).toEqual(new Date(now.getTime() + 90_000));
    expect(update.$set.widening_stopped_at).toEqual(now);
    expect(update.$unset).toEqual({ expiry_claim: 1 });
    expect(update.$push.timeline.event).toBe('widening_stopped_enough_offers');
  });

  it('stops even after the last stage (no extended stage, no close) and logs the stop only once', async () => {
    const lastStandard = { ...dueBroadcast, current_round: 3, widening_stopped_at: new Date('2026-08-27T09:58:00.000Z') };
    const { service, broadcasts, broadcastService } = setup({ offers: [], broadcasts: [lastStandard], broadcastClaim: lastStandard, liveOffers: 5, stopAfter: 3 });
    const result = await service.expireDuePharmacyOffers(now);
    expect(result).toEqual(expect.objectContaining({ advanced_rounds: 0, closed_broadcasts: 0 }));
    expect(broadcastService.findEligiblePharmaciesWithin).not.toHaveBeenCalled();
    const update = broadcasts.updateOne.mock.calls[0][1];
    expect(update.$push).toBeUndefined();
    expect(update.$set.widening_stopped_at).toEqual(lastStandard.widening_stopped_at);
  });

  it('keeps widening below the threshold, and never stops when the setting is 0', async () => {
    const below = setup({ offers: [], broadcasts: [dueBroadcast], liveOffers: 2, stopAfter: 3 });
    expect(await below.service.expireDuePharmacyOffers(now)).toEqual(expect.objectContaining({ advanced_rounds: 1 }));
    const never = setup({ offers: [], broadcasts: [dueBroadcast], liveOffers: 50, stopAfter: 0 });
    expect(await never.service.expireDuePharmacyOffers(now)).toEqual(expect.objectContaining({ advanced_rounds: 1 }));
    expect(never.offers.countDocuments).not.toHaveBeenCalled();
  });

  it('returns independent cursor fields when a bounded stream reaches its limit', async () => {
    const { service } = setup({ offers: [expiredOffer], broadcasts: [] });
    const result = await service.expireDuePharmacyOffers(now, {}, 1);
    expect(result.next_cursor).toEqual({ offer_id: 'offer-1', broadcast_id: undefined });
  });
});
