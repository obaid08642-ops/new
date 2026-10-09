import { PatientPharmacyController } from './pharmacy.controllers';

// Needs-review #539: the insurance-rejection cancel accepts the Idempotency-Key header like the other mutations.
describe('PatientPharmacyController insurance-rejection cancel', () => {
  const make = () => {
    const insurance = { cancelRejectedByPatient: jest.fn().mockResolvedValue({ ok: true }) };
    return { insurance, controller: new PatientPharmacyController({} as any, {} as any, insurance as any, {} as any) };
  };

  it('passes the Idempotency-Key header when the body has no key', async () => {
    const { insurance, controller } = make();
    await controller.cancelRejectedInsurance({ id: 'p1' }, 'o1', {} as any, 'hdr-key');
    expect(insurance.cancelRejectedByPatient).toHaveBeenCalledWith({ id: 'p1' }, 'o1', 'hdr-key');
  });

  it('prefers the body key when both are sent', async () => {
    const { insurance, controller } = make();
    await controller.cancelRejectedInsurance({ id: 'p1' }, 'o1', { idempotency_key: 'body-key' } as any, 'hdr-key');
    expect(insurance.cancelRejectedByPatient).toHaveBeenCalledWith({ id: 'p1' }, 'o1', 'body-key');
  });
});
