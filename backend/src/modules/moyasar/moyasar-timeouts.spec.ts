import { GatewayTimeoutException } from '@nestjs/common';
import { MoyasarService } from './moyasar.module';

// A gateway that never answers: the call must end in a typed 504 at the limit, a POST is sent once, and the stored
// payment is left exactly as it was (reconciliation reads the real status later).
describe('Moyasar calls time out', () => {
  const realFetch = global.fetch;
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.MOYASAR_API_KEY = 'sk_test_x';
    process.env.PAYMENT_GATEWAY_TIMEOUT_MS = '60';
  });
  afterEach(() => { global.fetch = realFetch; process.env = { ...OLD }; });

  const hang = () => jest.fn((_u: string, init?: RequestInit) => new Promise<Response>((_r, rej) => {
    init?.signal?.addEventListener('abort', () => rej(init.signal!.reason));
  }));

  function service(payment: any) {
    const model: any = {
      findOne: jest.fn(async () => payment),
      create: jest.fn(),
    };
    return { svc: new MoyasarService(model, {} as any, { emit: jest.fn() } as any), model };
  }

  it('createPayment: 504 payment_gateway_timeout, one POST, nothing stored', async () => {
    const f = hang();
    global.fetch = f as any;
    const { svc, model } = service(null);
    await expect(svc.createPayment({ bookingId: 'b1', bookingKind: 'x', patientId: 'p1', amount: 50, skipBookingValidation: true }))
      .rejects.toMatchObject({ status: 504, response: expect.objectContaining({ message: 'payment_gateway_timeout' }) });
    expect(f).toHaveBeenCalledTimes(1);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('refundPayment: 504 refund_gateway_timeout, one POST, the payment is not marked refunded', async () => {
    const f = hang();
    global.fetch = f as any;
    const payment: any = { moyasar_id: 'm1', amount: 50, status: 'paid', save: jest.fn() };
    const { svc } = service(payment);
    await expect(svc.refundPayment('m1', 50)).rejects.toBeInstanceOf(GatewayTimeoutException);
    expect(f).toHaveBeenCalledTimes(1);
    expect(payment.status).toBe('paid');
    expect(payment.save).not.toHaveBeenCalled();
  });

  it('syncPaymentStatus: a read, repeated at most twice, then the payment keeps its status', async () => {
    const f = hang();
    global.fetch = f as any;
    const payment: any = { moyasar_id: 'm2', status: 'initiated', save: jest.fn() };
    const { svc } = service(payment);
    const t0 = Date.now();
    const out = await svc.syncPaymentStatus('m2');
    expect(out).toBe(payment);
    expect(payment.status).toBe('initiated');
    expect(payment.save).not.toHaveBeenCalled();
    expect(f).toHaveBeenCalledTimes(3);
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});
