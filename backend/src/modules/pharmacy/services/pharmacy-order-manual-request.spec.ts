import { BadRequestException } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';

/**
 * P5.3: the canonical pharmacy create() also serves the retired compat
 * manual-request shape (web manual form posts {manual_request, payment_method}).
 */
describe('PharmacyOrderService.create manual request', () => {
  const make = () => {
    const created: any[] = [];
    const orders: any = {
      create: jest.fn(async (doc: any) => {
        created.push(doc);
        return { ...doc, toObject: () => doc };
      }),
    };
    const service = new PharmacyOrderService(
      orders,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { emit: jest.fn() } as any,
      { announceCreated: jest.fn().mockResolvedValue(undefined) } as any,
    );
    return { service, orders, created };
  };
  const patient = { id: 'patient-1', role: 'patient' };

  it('creates a broadcast order from a manual free-text request', async () => {
    const { service, created } = make();
    const out = await service.create(patient, {
      manual_request: { name: 'Panadol Extra', details: ' encounters' },
      payment_method: 'cash',
    });
    expect(created).toHaveLength(1);
    expect(created[0].items).toHaveLength(1);
    expect(created[0].items[0].raw_name).toBe('Panadol Extra');
    expect(created[0].manual_request).toEqual({ name: 'Panadol Extra', details: 'encounters' });
    expect(created[0].payment_method).toBe('cash');
    expect(out.status).toBeDefined();
  });

  it('still rejects an empty body without items, prescription, or manual text', async () => {
    const { service } = make();
    await expect(service.create(patient, {})).rejects.toBeInstanceOf(BadRequestException);
  });
});
