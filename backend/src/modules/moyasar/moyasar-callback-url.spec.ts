import { MoyasarService } from './moyasar.module';

// Order d: the return address a caller supplies must be one of our own origins; the refusal comes before any booking lookup or gateway call.
describe('createPayment callback_url allow-list', () => {
  const make = () => {
    const model: any = { findOne: jest.fn(), create: jest.fn() };
    return { svc: new MoyasarService(model, {} as any, { emit: jest.fn() } as any), model };
  };
  const call = (svc: MoyasarService, callbackUrl?: string) =>
    svc.createPayment({ bookingId: 'b1', bookingKind: 'consultation', patientId: 'p1', amount: 100, callbackUrl });

  it.each(['https://evil.example/pay', 'http://nabd.plus/x', 'https://nabd.plus.evil.example/', 'javascript:alert(1)', 'https://user:pw@nabd.plus/x'])('refuses %s with 400 and touches nothing', async (u) => {
    const { svc, model } = make();
    await expect(call(svc, u)).rejects.toMatchObject({ status: 400, response: { message: 'callback_url_not_allowed' } });
    expect(model.findOne).not.toHaveBeenCalled();
    expect(model.create).not.toHaveBeenCalled();
  });

  it('an allowed address is not refused by the allow-list (it proceeds to the normal checks)', async () => {
    const { svc } = make();
    await expect(call(svc, 'https://api.nabd.plus/api/v1/moyasar/callback')).rejects.not.toMatchObject({ response: { message: 'callback_url_not_allowed' } });
  });
});
