import { ServiceUnavailableException } from '@nestjs/common';
import { PharmacyOpsController, ProviderPharmacyAliasController } from './pharmacy_ops.controller';

describe('legacy pharmacy mutation containment', () => {
  const expectCanonicalReject = async (call: () => any) => {
    await expect(Promise.resolve().then(call)).rejects.toBeInstanceOf(ServiceUnavailableException);
  };

  it('rejects PharmacyOps mutations without touching legacy services', async () => {
    const controller = new PharmacyOpsController({} as any, {} as any);
    await expectCanonicalReject(() => controller.accept());
    await expectCanonicalReject(() => controller.reject());
    await expectCanonicalReject(() => controller.preparingAction());
    await expectCanonicalReject(() => controller.readyAction());
    await expectCanonicalReject(() => controller.partial());
    await expectCanonicalReject(() => controller.itemUnavailable());
    await expectCanonicalReject(() => controller.itemRestore());
    await expectCanonicalReject(() => controller.itemQty());
    await expectCanonicalReject(() => controller.itemSub());
    await expectCanonicalReject(() => controller.submitBasket());
    await expectCanonicalReject(() => controller.setInsurance(undefined as any, undefined as any, undefined as any));
  });

  it('rejects every provider alias mutation', async () => {
    const controller = new ProviderPharmacyAliasController({} as any, {} as any);
    await expectCanonicalReject(() => controller.accept());
    await expectCanonicalReject(() => controller.submitBasket());
    await expectCanonicalReject(() => controller.insurance(undefined as any, undefined as any, undefined as any));
    await expectCanonicalReject(() => controller.dispatch());
  });
});
