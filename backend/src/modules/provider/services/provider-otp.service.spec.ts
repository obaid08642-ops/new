import { ProviderOtpService } from './provider-otp.service';
import { ProviderMailerService } from './provider-mailer.service';
import { OtpPurpose } from '../schemas';

describe('ProviderOtpService.issue', () => {
  const setup = (status: 'sent' | 'failed') => {
    const created: any[] = [];
    const otpModel: any = {
      findOne: jest.fn(() => ({ sort: jest.fn().mockResolvedValue(null) })),
      updateMany: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(async (d: any) => { created.push(d); return { _id: 'otp1', ...d }; }),
    };
    const mailer: any = { send: jest.fn(async () => ({ status })) };
    const svc = new ProviderOtpService(otpModel, { create: jest.fn() } as any, mailer);
    return { svc, otpModel, mailer, created };
  };

  it('answers 503 (not "sent") and voids the code when the mail was not delivered', async () => {
    const { svc, otpModel } = setup('failed');
    await expect(svc.issue('p@example.test', OtpPurpose.EMAIL_VERIFICATION)).rejects.toMatchObject({ status: 503 });
    expect(otpModel.updateOne).toHaveBeenCalledWith({ _id: 'otp1' }, expect.anything());
  });

  it('sends a 6-digit code when delivery works', async () => {
    const { svc, mailer } = setup('sent');
    await expect(svc.issue('p@example.test', OtpPurpose.EMAIL_VERIFICATION)).resolves.toMatchObject({ sent: true });
    expect(mailer.send.mock.calls[0][0].text).toMatch(/\b\d{6}\b/);
  });
});

describe('ProviderMailerService channel', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  it('uses the SES SMTP settings the patient mailer uses (only SES configured -> not disabled)', async () => {
    delete process.env.RESEND_API_KEY; delete process.env.SMTP_USER; delete process.env.SMTP_PASS; delete process.env.SMTP_HOST;
    Object.assign(process.env, { SES_SMTP_HOST: '127.0.0.1', SES_SMTP_PORT: '2525', SES_SMTP_USER: 'u', SES_SMTP_PASS: 'p' });
    const m: any = new ProviderMailerService();
    expect(m.adapter.constructor.name).toBe('NodemailerAdapter');
  });
});
