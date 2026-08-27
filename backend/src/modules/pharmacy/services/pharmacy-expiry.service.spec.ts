import { PharmacyExpiryService } from './pharmacy-expiry.service';

const chain = (value: any) => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(value) });

function model() {
  return { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
}

function createService() {
  const offers = model(); const broadcasts = model(); const orders = model(); const audits = model(); const outbox = model(); const leases = model();
  leases.findOneAndUpdate.mockImplementation((_filter: any, update: any) => Promise.resolve({ owner_token: update.$set.owner_token }));
  return { service: new PharmacyExpiryService(offers as any, broadcasts as any, orders as any, audits as any, outbox as any, leases as any), offers, broadcasts, orders, audits, outbox, leases };
}

describe('PharmacyExpiryService', () => {
  const now = new Date('2026-08-27T12:00:00.000Z');

  it('expires only an open due offer and writes one passive audit/outbox pair', async () => {
    const { service, offers, broadcasts, audits, outbox } = createService();
    offers.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([{ id: 'offer-1', order_id: 'order-1', status: 'open', expires_at: new Date(now.getTime() - 1), expiry_version: 1 }]));
    broadcasts.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([]));
    offers.findOneAndUpdate.mockResolvedValue({ id: 'offer-1', order_id: 'order-1', expiry_version: 2 });

    const result = await service.expireDuePharmacyOffers(now, {}, 10);

    expect(result).toMatchObject({ acquired: true, offers_expired: 1, broadcasts_closed: 0 });
    expect(offers.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'open', expires_at: { $lte: now } }), expect.objectContaining({ $set: expect.objectContaining({ status: 'expired', expiry_artifacts_pending: true }) }), { new: true });
    expect(audits.updateOne).toHaveBeenCalledTimes(1);
    expect(outbox.updateOne).toHaveBeenCalledWith({ dedupe_key: 'pharmacy-expiry:offer:offer-1:v2' }, expect.anything(), { upsert: true });
  });

  it('is safe to retry after restart by reconciling a pending expired offer with deduplicated artifacts', async () => {
    const { service, offers, broadcasts, audits, outbox } = createService();
    const pending = { id: 'offer-1', order_id: 'order-1', status: 'expired', expiry_artifacts_pending: true, expiry_version: 2, expiry_reason: 'offer_ttl_elapsed' };
    offers.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([pending])).mockReturnValueOnce(chain([]));
    broadcasts.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([]));

    const result = await service.expireDuePharmacyOffers(now, {}, 10);

    expect(result.offers_expired).toBe(0);
    expect(audits.updateOne).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'offer', entity_id: 'offer-1', event_version: 2 }), expect.anything(), { upsert: true });
    expect(outbox.updateOne).toHaveBeenCalledWith({ dedupe_key: 'pharmacy-expiry:offer:offer-1:v2' }, expect.anything(), { upsert: true });
  });

  it('uses the same unique outbox key when a pending artifact is retried', async () => {
    const { service, offers, broadcasts, outbox } = createService();
    const pending = { id: 'offer-1', order_id: 'order-1', status: 'expired', expiry_artifacts_pending: true, expiry_version: 2, expiry_reason: 'offer_ttl_elapsed' };
    offers.find
      .mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([pending])).mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([pending])).mockReturnValueOnce(chain([]));
    broadcasts.find
      .mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([]));

    await service.expireDuePharmacyOffers(now, {}, 10);
    await service.expireDuePharmacyOffers(new Date(now.getTime() + 1), {}, 10);

    expect(outbox.updateOne).toHaveBeenCalledTimes(2);
    expect(outbox.updateOne.mock.calls.map((call: any[]) => call[0])).toEqual([
      { dedupe_key: 'pharmacy-expiry:offer:offer-1:v2' },
      { dedupe_key: 'pharmacy-expiry:offer:offer-1:v2' },
    ]);
    expect(outbox.updateOne.mock.calls.every((call: any[]) => call[2]?.upsert === true)).toBe(true);
  });

  it('does not expire an offer when concurrent patient selection has already won the conditional update', async () => {
    const { service, offers, broadcasts, audits, outbox } = createService();
    offers.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([{ id: 'offer-1', order_id: 'order-1', status: 'open', expires_at: new Date(now.getTime() - 1), expiry_version: 1 }]));
    broadcasts.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([]));
    offers.findOneAndUpdate.mockResolvedValue(null);

    const result = await service.expireDuePharmacyOffers(now, {}, 10);

    expect(result.offers_expired).toBe(0);
    expect(audits.updateOne).not.toHaveBeenCalled();
    expect(outbox.updateOne).not.toHaveBeenCalled();
  });

  it('skips a selected or insurance/payment order when a broadcast is due', async () => {
    const { service, offers, broadcasts, orders } = createService();
    offers.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([]));
    broadcasts.find.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([{ id: 'broadcast-1', order_id: 'order-1', lock_state: 'open', expires_at: new Date(now.getTime() - 1), expiry_version: 1 }]));
    orders.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'order-1', selected_offer_id: 'offer-1', governed_state: 'PAYMENT_PENDING' }) });

    const result = await service.expireDuePharmacyOffers(now, {}, 10);

    expect(result.broadcasts_closed).toBe(0);
    expect(orders.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns a bounded non-owner result when another invocation holds the lease', async () => {
    const { service, leases } = createService();
    leases.findOneAndUpdate.mockResolvedValue({ owner_token: 'other-run' });

    await expect(service.expireDuePharmacyOffers(now, {}, 9999)).resolves.toMatchObject({ acquired: false, skipped: 'concurrent_run', offers_expired: 0 });
  });
});
