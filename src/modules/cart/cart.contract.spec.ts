import { NotFoundException } from '@nestjs/common';
import { CartService } from './cart.module';

describe('CartService contract items', () => {
  const makeService = (medicine: any) => {
    const cart: any = {
      id: 'cart-1', patient_id: 'patient-1', lines: [], save: jest.fn().mockResolvedValue(undefined),
      toObject() { return { id: this.id, patient_id: this.patient_id, lines: this.lines }; },
    };
    const cartModel = {
      findOne: jest.fn().mockResolvedValue(cart),
      create: jest.fn().mockResolvedValue(cart),
    };
    const medicines = { findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(medicine) })) };
    return { cart, cartModel, medicines, service: new CartService(cartModel as any, medicines as any) };
  };

  it('uses catalog name and price instead of accepting client-controlled values', async () => {
    const { service, cart } = makeService({ id: 'med-1', name_ar: 'دواء موثوق', name_en: 'Trusted medicine', price: 31.5, requires_prescription: true });

    await service.addContractItem({ id: 'patient-1' }, { medicine_id: 'med-1', quantity: 2 });

    expect(cart.lines).toEqual([expect.objectContaining({
      service_id: 'med-1', name_ar: 'دواء موثوق', price: 31.5, qty: 2,
      meta: expect.objectContaining({ source: 'catalog', requires_prescription: true }),
    })]);
  });

  it('keeps manual medication requests at zero quoted price and pending review', async () => {
    const { service, cart } = makeService(null);

    await service.addContractItem({ id: 'patient-1' }, { manual_name: 'دواء غير موجود', quantity: 1 });

    expect(cart.lines[0]).toEqual(expect.objectContaining({
      kind: 'pharmacy', price: 0, meta: { source: 'patient_manual', review_status: 'PENDING_REVIEW' },
    }));
  });

  it('returns a not-found result for an unknown catalog medicine', async () => {
    const { service } = makeService(null);
    await expect(service.addContractItem({ id: 'patient-1' }, { medicine_id: 'missing', quantity: 1 })).rejects.toBeInstanceOf(NotFoundException);
  });
});
