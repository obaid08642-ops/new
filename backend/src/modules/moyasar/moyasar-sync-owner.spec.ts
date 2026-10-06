import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MoyasarController } from './moyasar.module';

/** GET /moyasar/payments/sync/:id must only sync the caller's own payment. */
describe('MoyasarController.syncStatus ownership', () => {
  const stored = { moyasar_id: 'pay_1', patient_id: 'patient-1', status: 'initiated' };
  let svc: any;
  let ctrl: MoyasarController;

  beforeEach(() => {
    svc = {
      findByMoyasarId: jest.fn(async (id: string) => (id === 'pay_1' ? stored : null)),
      syncPaymentStatus: jest.fn(async () => ({ ...stored, status: 'paid', raw_response: { source: { token: 'tok_secret' } } })),
    };
    ctrl = new MoyasarController(svc);
  });

  it('rejects another patient before contacting Moyasar', async () => {
    await expect(ctrl.syncStatus({ id: 'attacker', role: 'patient' }, 'pay_1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(svc.syncPaymentStatus).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown payment', async () => {
    await expect(ctrl.syncStatus({ id: 'patient-1', role: 'patient' }, 'pay_x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('syncs for the owner and admin without the raw gateway response', async () => {
    const own = await ctrl.syncStatus({ id: 'patient-1', role: 'patient' }, 'pay_1');
    expect(own.status).toBe('paid');
    expect(own.raw_response).toBeUndefined();
    await expect(ctrl.syncStatus({ id: 'admin-1', role: 'admin' }, 'pay_1')).resolves.toMatchObject({ status: 'paid' });
  });
});
