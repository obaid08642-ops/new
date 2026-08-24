import { BadRequestException } from '@nestjs/common';
import { PharmacyAllocationService } from './pharmacy-allocation.service';
import { PharmacyAllocationState, AllocationItemAction } from '../schemas/pharmacy.schema';

const provider = { id: 'pharmacy-user-1', role: 'pharmacy' };

function allocation(overrides: Record<string, unknown> = {}) {
  const value: any = {
    id: 'allocation-1',
    pharmacy_account_id: provider.id,
    order_id: 'order-1',
    status: PharmacyAllocationState.PENDING_REVIEW,
    items: [{ id: 'line-1', action: AllocationItemAction.AVAILABLE, qty_offered: 1, unit_price: 10 }],
    estimated_preparation_minutes: 20,
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn().mockReturnValue({ id: 'allocation-1' }),
    ...overrides,
  };
  return value;
}

function buildService(a: any) {
  const allocs = {
    findOne: jest.fn().mockResolvedValue(a),
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  } as any;
  const orders = { findOne: jest.fn().mockResolvedValue(null) } as any;
  const inv = {} as any;
  const split = { releaseStockForAllocation: jest.fn() } as any;
  const notif = {
    notifyPatientAllocationConfirmed: jest.fn(),
    notifyPatientAllocationProgress: jest.fn(),
    notifyPatientAllocationCancelled: jest.fn(),
    notifyPatientItemUnavailable: jest.fn(),
  } as any;
  const bus = { emit: jest.fn().mockResolvedValue(undefined) } as any;
  const engine = { transition: jest.fn().mockResolvedValue(undefined) } as any;
  return new PharmacyAllocationService(allocs, orders, inv, split, notif, bus, engine);
}

describe('PharmacyAllocationService legacy document safety', () => {
  it('rejects an unknown historical state without calling includes on undefined', async () => {
    const a = allocation({ status: 'OBSOLETE_STATE', timeline: undefined, totals: undefined });
    const service = buildService(a);

    await expect(service.confirm(provider, a.id)).rejects.toThrow(BadRequestException);
    expect(a.save).not.toHaveBeenCalled();
  });

  it('initializes a missing timeline and totals for a valid provider confirmation', async () => {
    const a = allocation({ timeline: undefined, totals: undefined });
    const service = buildService(a);

    await expect(service.confirm(provider, a.id)).resolves.toEqual({ id: 'allocation-1' });
    expect(a.totals).toEqual({ subtotal: 0, delivery_fee: 0, total: 0 });
    expect(a.timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ event: PharmacyAllocationState.CONFIRMED, by: provider.id }),
    ]));
    expect(a.save).toHaveBeenCalledTimes(1);
  });
});
