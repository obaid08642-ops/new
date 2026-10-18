import { PriceAlertsService, bucketOf, isDrop } from './price-alerts.service';
import { NotificationType } from '../../common/enums';

const NOW = new Date('2026-10-18T10:30:00Z');

function build(opts: { medicines: any[]; last?: { medicine_id: string; price: number }[]; holders?: string[]; insertFails?: boolean }) {
  const history: any[] = [];
  const medicinesFind = jest.fn((..._args: any[]) => ({ toArray: async () => opts.medicines }));
  const holdersFind = jest.fn(() => ({ toArray: async () => (opts.holders ?? []).map((user_id) => ({ user_id })) }));
  const conn: any = {
    collection: (name: string) => {
      if (name === 'medicines') return { find: medicinesFind };
      if (name === 'patient_profiles') return { find: holdersFind, createIndex: async () => 'ok' };
      return {
        createIndex: async () => 'ok',
        aggregate: () => ({ toArray: async () => (opts.last ?? []).map((r) => ({ _id: r.medicine_id, price: r.price })) }),
        insertOne: async (doc: any) => {
          if (opts.insertFails) throw Object.assign(new Error('dup'), { code: 11000 });
          history.push(doc);
        },
      };
    },
  };
  const notifications = { create: jest.fn(async () => ({})) };
  const service = new PriceAlertsService(conn, notifications as any);
  return { service, notifications, history, medicinesFind };
}

const med = (id: string, price: number) => ({ id, price });

describe('PriceAlertsService (22.2)', () => {
  it('records the first price of a medicine without alerting anyone', async () => {
    const { service, notifications, history } = build({ medicines: [med('m1', 100)], holders: ['pat-1'] });
    expect(await service.sweep(NOW)).toBe(0);
    expect(history).toEqual([expect.objectContaining({ _id: 'm1|2026-10-18T11', medicine_id: 'm1', price: 100, previous_price: null })]);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('alerts wishlist holders when the price falls by 5% or more', async () => {
    const { service, notifications, history } = build({ medicines: [med('m1', 95)], last: [{ medicine_id: 'm1', price: 100 }], holders: ['pat-1', 'pat-2'] });
    expect(await service.sweep(NOW)).toBe(2);
    expect(history[0]).toEqual(expect.objectContaining({ price: 95, previous_price: 100 }));
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'pat-1', type: NotificationType.PROMO, title_key: 'notif.price_drop.title', action: { route: '/pharmacy/product/m1' },
    }));
  });

  it('does not alert for a drop under 5%', async () => {
    const { service, notifications, history } = build({ medicines: [med('m1', 96)], last: [{ medicine_id: 'm1', price: 100 }], holders: ['pat-1'] });
    expect(await service.sweep(NOW)).toBe(0);
    expect(history).toHaveLength(1);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('does not alert for a rise and records nothing when the price is unchanged', async () => {
    const rise = build({ medicines: [med('m1', 120)], last: [{ medicine_id: 'm1', price: 100 }], holders: ['pat-1'] });
    expect(await rise.service.sweep(NOW)).toBe(0);
    expect(rise.notifications.create).not.toHaveBeenCalled();
    const same = build({ medicines: [med('m1', 100)], last: [{ medicine_id: 'm1', price: 100 }], holders: ['pat-1'] });
    expect(await same.service.sweep(NOW)).toBe(0);
    expect(same.history).toHaveLength(0);
  });

  it('excludes prescription and controlled medicines from the sweep', async () => {
    const { service, medicinesFind } = build({ medicines: [] });
    await service.sweep(NOW);
    const filter = (medicinesFind.mock.calls[0] as any[])[0];
    expect(filter).toEqual(expect.objectContaining({ requires_prescription: { $ne: true }, controlled: { $ne: true }, public_eligibility: true }));
  });

  it('does not notify twice when another instance already recorded this hour', async () => {
    const { service, notifications } = build({ medicines: [med('m1', 90)], last: [{ medicine_id: 'm1', price: 100 }], holders: ['pat-1'], insertFails: true });
    expect(await service.sweep(NOW)).toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('skips medicines with no usable price', async () => {
    const { service, history } = build({ medicines: [med('m1', 0), med('m2', NaN as any)] });
    await service.sweep(NOW);
    expect(history).toHaveLength(0);
  });

  it('uses the nearest hour as the key, so a run just before the hour and one just after share it', () => {
    expect(bucketOf(new Date('2026-10-18T10:59:59.996Z'))).toBe('2026-10-18T11');
    expect(bucketOf(new Date('2026-10-18T11:00:00.004Z'))).toBe('2026-10-18T11');
    expect(bucketOf(new Date('2026-10-18T11:20:00Z'))).toBe('2026-10-18T11');
  });

  it('alerts on an exact 5% drop on a two-decimal price', () => {
    expect(isDrop(3, 2.85)).toBe(true);
    expect(isDrop(1.4, 1.33)).toBe(true);
    expect(isDrop(100, 95.01)).toBe(false);
  });

  it('keeps discontinued and inactive medicines out of the sweep', async () => {
    const { service, medicinesFind } = build({ medicines: [] });
    await service.sweep(NOW);
    const filter = (medicinesFind.mock.calls[0] as any[])[0];
    expect(filter).toEqual(expect.objectContaining({ active: { $ne: false }, availability_status: { $ne: 'discontinued' } }));
  });
});
