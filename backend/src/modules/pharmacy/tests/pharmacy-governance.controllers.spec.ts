import { ServiceUnavailableException } from '@nestjs/common';
import { ProviderPharmacyController, AdminBroadcastController } from '../pharmacy.controllers';

describe('pharmacy governance controllers', () => {
  const rejects = async (fn: () => any) => {
    await expect(Promise.resolve().then(fn)).rejects.toBeInstanceOf(ServiceUnavailableException);
  };

  it('rejects every legacy provider order mutation', async () => {
    // R4/F1: acceptOrder/submitBasket/evaluateInsurance/orderDispatch were
    // deleted (duplicates of pharmacy_ops). The surviving stubs must still
    // throw the canonical 503.
    const providerOrders = { orderPreparing: jest.fn(), orderReady: jest.fn() };
    const controller = new ProviderPharmacyController({} as any, {} as any, providerOrders as any, {} as any);
    await rejects(() => controller.orderPreparing());
    await rejects(() => controller.orderReady());
    expect(providerOrders.orderPreparing).not.toHaveBeenCalled();
    expect(providerOrders.orderReady).not.toHaveBeenCalled();
  });

  it('rejects admin manual broadcast advance and leaves expiry command as the explicit route', async () => {
    const expiry = { expireDuePharmacyOffers: jest.fn() };
    const controller = new AdminBroadcastController({} as any, expiry as any);
    await rejects(() => controller.advance());
    expect(expiry.expireDuePharmacyOffers).not.toHaveBeenCalled();
  });
});
