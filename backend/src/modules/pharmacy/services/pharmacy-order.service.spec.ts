import { PharmacyOrderState } from '../schemas/pharmacy.schema';
import { PharmacyOrderService } from './pharmacy-order.service';

function createService(order?: any) {
  const orders = {
    create: jest.fn(async (value: any) => ({ ...value, toObject: () => value })),
    findOne: jest.fn(async () => order),
  };
  const engine = { announceCreated: jest.fn().mockResolvedValue(undefined), transition: jest.fn() };
  return {
    orders,
    service: new PharmacyOrderService(
      orders as any,
      { find: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      engine as any,
    ),
  };
}

describe('PharmacyOrderService client pricing boundary', () => {
  const patient = { id: 'patient-1', role: 'patient' };

  it('strips a client-provided price while creating a broadcast-first pharmacy draft', async () => {
    const { service, orders } = createService();

    await service.create(patient, { items: [{ name_ar: 'دواء', qty: 2, unit_price: 0.01 }], delivery_address: { city: 'Riyadh' } });

    expect(orders.create).toHaveBeenCalledWith(expect.objectContaining({
      totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' },
      items: [expect.not.objectContaining({ unit_price: expect.anything() })],
    }));
  });

  it('strips a client-provided price while editing a pharmacy draft', async () => {
    const order = {
      id: 'order-1', patient_account_id: 'patient-1', status: PharmacyOrderState.DRAFT, items: [], timeline: [], save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({ id: 'order-1' })),
    };
    const { service } = createService(order);

    await service.update(patient, 'order-1', { items: [{ id: 'item-1', name_ar: 'دواء', qty: 1, unit_price: 1 }] });

    expect(order.items).toEqual([expect.not.objectContaining({ unit_price: expect.anything() })]);
  });
});
