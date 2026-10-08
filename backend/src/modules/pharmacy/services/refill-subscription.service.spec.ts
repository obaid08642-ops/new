import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  RefillSubscriptionService,
  refillDateKey,
} from './refill-subscription.service';

/** In-memory mongo-collection double with the ops the service uses. */
function memCollection(seed: Array<Record<string, unknown>> = []) {
  const docs: Array<Record<string, unknown>> = [...seed];
  const match = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
    Object.entries(filter || {}).every(([k, cond]) => {
      const v = doc[k];
      if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>;
        if ('$eq' in c) return v === c['$eq'];
        if ('$in' in c) return (c['$in'] as unknown[]).includes(v);
        if ('$lte' in c)
          return new Date(String(v)).getTime() <= new Date(String(c['$lte'])).getTime();
        if ('$gt' in c)
          return new Date(String(v)).getTime() > new Date(String(c['$gt'])).getTime();
        if ('$ne' in c) return v !== c['$ne'];
        if ('$exists' in c) return c['$exists'] ? k in doc : !(k in doc);
        return false;
      }
      return v === cond;
    });
  return {
    docs,
    find: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => ({
      toArray: jest.fn().mockResolvedValue(docs.filter((d) => match(d, filter))),
    })),
    findOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => {
      const hit = docs.find((d) => match(d, filter));
      return hit ? { ...hit } : null;
    }),
    insertOne: jest.fn().mockImplementation(async (doc: Record<string, unknown>) => {
      docs.push({ ...doc });
      return { acknowledged: true };
    }),
    updateOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>, upd: { $set?: Record<string, unknown> }) => {
      const hit = docs.find((d) => match(d, filter));
      if (!hit) return { matchedCount: 0 };
      Object.assign(hit, upd.$set || {});
      return { matchedCount: 1 };
    }),
    findOneAndUpdate: jest.fn().mockImplementation(
      async (filter: Record<string, unknown>, upd: { $set?: Record<string, unknown> }) => {
        const hit = docs.find((d) => match(d, filter));
        if (!hit) return { value: null };
        Object.assign(hit, upd.$set || {});
        return { value: { ...hit } };
      },
    ),
    createIndex: jest.fn().mockResolvedValue('idx'),
  };
}

describe('RefillSubscriptionService (P22.1 auto-refill)', () => {
  const day = 24 * 3600 * 1000;

  const otcMed = { id: 'med-otc', name_ar: 'بنادول', requires_prescription: false };
  const rxMed = {
    id: 'med-rx',
    name_ar: 'دواء مزمن',
    requires_prescription: true,
    active_ingredient: 'atorvastatin',
  };
  const freshRx = {
    id: 'rx-1',
    patient_id: 'patient-1',
    items: [{ medicine_id: 'med-rx' }],
    verified_at: new Date(Date.now() - 10 * day),
  };
  const staleRx = {
    id: 'rx-old',
    patient_id: 'patient-1',
    items: [{ active_ingredient: 'atorvastatin' }],
    verified_at: new Date(Date.now() - 200 * day),
  };

  function setup(seed?: {
    prescriptions?: Array<Record<string, unknown>>;
    subs?: Array<Record<string, unknown>>;
  }) {
    const collections: Record<string, ReturnType<typeof memCollection>> = {
      medicines: memCollection([otcMed, rxMed]),
      prescriptions: memCollection(
        (seed?.prescriptions ?? [freshRx]) as Array<Record<string, unknown>>,
      ),
      refill_subscriptions: memCollection(seed?.subs ?? []),
      pharmacy_orders: memCollection([]),
    };
    const conn = { collection: jest.fn((n: string) => collections[n]) };
    const notif = {
      notifyRefillReminder: jest.fn().mockResolvedValue(null),
      notifyRefillOrderCreated: jest.fn().mockResolvedValue(null),
      notifyRefillExpired: jest.fn().mockResolvedValue(null),
    };
    const service = new RefillSubscriptionService(conn as never, notif as never);
    return { service, collections, notif };
  }

  it('subscribes an OTC-only refill without a prescription', async () => {
    const { service, collections } = setup();
    const sub = await service.subscribe(
      'patient-1',
      { items: [{ medicine_id: 'med-otc', qty: 1 }], cadence_days: 30 },
      'idem-1',
    );
    expect(sub.status).toBe('active');
    expect(sub.next_refill_at.getTime()).toBeGreaterThan(Date.now());
    expect(collections.refill_subscriptions.docs).toHaveLength(1);
  });

  it('is idempotent on the subscription idempotency key', async () => {
    const { service, collections } = setup();
    const dto = { items: [{ medicine_id: 'med-otc', qty: 1 }], cadence_days: 30 };
    const a = await service.subscribe('patient-1', dto, 'idem-2');
    const b = await service.subscribe('patient-1', dto, 'idem-2');
    expect(a.id).toBe(b.id);
    expect(collections.refill_subscriptions.docs).toHaveLength(1);
  });

  it('requires a prescription for Rx items', async () => {
    const { service } = setup();
    await expect(
      service.subscribe('patient-1', {
        items: [{ medicine_id: 'med-rx', qty: 1 }],
        cadence_days: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an Rx subscription whose prescription already expired', async () => {
    const { service } = setup({ prescriptions: [staleRx] });
    await expect(
      service.subscribe('patient-1', {
        items: [{ medicine_id: 'med-rx', qty: 1 }],
        cadence_days: 30,
        prescription_id: 'rx-old',
      }),
    ).rejects.toMatchObject({ response: { message: 'prescription_expired' } });
  });

  it('refuses when the prescription does not cover the item', async () => {
    const { service } = setup({
      prescriptions: [{ ...freshRx, items: [{ medicine_id: 'other' }] }],
    });
    const err = await service
      .subscribe('patient-1', {
        items: [{ medicine_id: 'med-rx', qty: 1 }],
        cadence_days: 30,
        prescription_id: 'rx-1',
      })
      .catch((e: Error) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(String((err as Error).message)).toMatch('prescription_does_not_cover');
  });

  it('rejects a foreign prescription (ownership)', async () => {
    const { service } = setup({
      prescriptions: [{ ...freshRx, patient_id: 'patient-2' }],
    });
    await expect(
      service.subscribe('patient-1', {
        items: [{ medicine_id: 'med-rx', qty: 1 }],
        cadence_days: 30,
        prescription_id: 'rx-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('subscribe → reminder → order created on the date (full lifecycle)', async () => {
    const { service, collections, notif } = setup();
    const sub = await service.subscribe('patient-1', {
      items: [{ medicine_id: 'med-otc', qty: 2 }],
      cadence_days: 30,
      reminder_days_before: 2,
      first_refill_at: new Date(Date.now() + 30 * day).toISOString(),
    });
    const refillAt = sub.next_refill_at.getTime();

    // 3 days before: nothing fires.
    await service.processDue(new Date(refillAt - 3 * day));
    expect(notif.notifyRefillReminder).not.toHaveBeenCalled();
    expect(collections.pharmacy_orders.docs).toHaveLength(0);

    // 1 day before: exactly one reminder.
    await service.processDue(new Date(refillAt - 1 * day));
    await service.processDue(new Date(refillAt - 12 * 3600 * 1000));
    expect(notif.notifyRefillReminder).toHaveBeenCalledTimes(1);
    expect(notif.notifyRefillReminder).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ subscription_id: sub.id }),
    );

    // On the date: one draft order, cadence advanced, creation notified.
    const out = await service.processDue(new Date(refillAt + 1000));
    expect(out.created).toBe(1);
    expect(collections.pharmacy_orders.docs).toHaveLength(1);
    const draft = collections.pharmacy_orders.docs[0];
    expect(draft['refill_idempotency_key']).toBe(
      `refill_${sub.id}_${refillDateKey(new Date(refillAt))}`,
    );
    expect(draft['status']).toBe('draft');
    expect(notif.notifyRefillOrderCreated).toHaveBeenCalledTimes(1);

    // Re-running on the same date never duplicates the draft.
    const again = await service.processDue(new Date(refillAt + 2000));
    expect(collections.pharmacy_orders.docs).toHaveLength(1);

    // Next refill is one cadence later.
    const stored = collections.refill_subscriptions.docs[0];
    const storedNext = stored['next_refill_at'];
    const storedMs =
      storedNext instanceof Date
        ? storedNext.getTime()
        : new Date(String(storedNext)).getTime();
    expect(storedMs).toBe(refillAt + 30 * day);
    expect(again.created).toBe(0);
  });

  it('expires the subscription instead of refilling past Rx validity', async () => {
    const { service, collections, notif } = setup();
    const sub = await service.subscribe('patient-1', {
      items: [{ medicine_id: 'med-rx', qty: 1 }],
      cadence_days: 30,
      prescription_id: 'rx-1',
      prescription_valid_until: new Date(Date.now() + 5 * day).toISOString(),
      first_refill_at: new Date(Date.now() + 30 * day).toISOString(),
    });
    // Rx lapses before the refill date.
    const out = await service.processDue(new Date(Date.now() + 31 * day));
    expect(out.expired).toBe(1);
    expect(out.created).toBe(0);
    expect(collections.pharmacy_orders.docs).toHaveLength(0);
    expect(collections.refill_subscriptions.docs[0]['status']).toBe('expired');
    expect(notif.notifyRefillExpired).toHaveBeenCalledTimes(1);

    // No repeat expiry notifications.
    await service.processDue(new Date(Date.now() + 40 * day));
    expect(notif.notifyRefillExpired).toHaveBeenCalledTimes(1);
  });

  it('cancels an active subscription; unknown id 404s', async () => {
    const { service } = setup();
    const sub = await service.subscribe(
      'patient-1',
      { items: [{ medicine_id: 'med-otc', qty: 1 }], cadence_days: 30 },
    );
    const cancelled = await service.cancel('patient-1', sub.id);
    expect(cancelled.status).toBe('cancelled');
    await expect(service.cancel('patient-1', sub.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.cancel('patient-2', sub.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
