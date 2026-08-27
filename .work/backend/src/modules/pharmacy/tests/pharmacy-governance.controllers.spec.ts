import { ServiceUnavailableException } from '@nestjs/common';
import { ProviderPharmacyController, AdminBroadcastController } from '../pharmacy.controllers';

describe('pharmacy governance controllers', () => {
  const rejects = async (fn: () => any) => {
    await expect(Promise.resolve().then(fn)).rejects.toBeInstanceOf(ServiceUnavailableException);
  };

  it('rejects every legacy provider order mutation', async () => {
    const providerOrders = { orderPreparing: jest.fn(), orderReady: jest.fn(), orderDispatch: jest.fn() };
    const controller = new ProviderPharmacyController({} as any, {} as any, providerOrders as any, {} as any);
    await rejects(() => controller.acceptOrder());
    await rejects(() => controller.submitBasket());
    await rejects(() => controller.evaluateInsurance());
    await rejects(() => controller.orderPreparing());
    await rejects(() => controller.orderReady());
    await rejects(() => controller.orderDispatch());
    expect(providerOrders.orderPreparing).not.toHaveBeenCalled();
    expect(providerOrders.orderReady).not.toHaveBeenCalled();
    expect(providerOrders.orderDispatch).not.toHaveBeenCalled();
  });

  it('rejects admin manual broadcast advance and leaves expiry command as the explicit route', async () => {
    const expiry = { expireDuePharmacyOffers: jest.fn() };
    const controller = new AdminBroadcastController({} as any, expiry as any);
    await rejects(() => controller.advance());
    expect(expiry.expireDuePharmacyOffers).not.toHaveBeenCalled();
  });
});
