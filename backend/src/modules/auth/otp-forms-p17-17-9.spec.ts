import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { SmsService } from '../sms/sms.service';

// P17-17.9: forms that are easy on a phone (backend part). Red on the base:
// verifyOtp compares the RAW code (Arabic-Indic digits never match),
// resetPassword looks the user up with the raw identifier, and the SMS body
// is not WebOTP/SMS-Retriever formatted.
jest.mock('axios', () => ({ post: jest.fn(async () => ({ status: 200 })) }));

describe('P17-17.9 phone-friendly OTP forms', () => {
  const OLD_ENV = { ...process.env };

  function authWith(entry: any, user: any) {
    const store = new Map<string, any>();
    const redis: any = {
      checkRateLimit: jest.fn(async () => ({ allowed: true })),
      getJson: jest.fn(async (k: string) => (k.includes('login-2fa') || k.includes('verify') ? entry : null)),
      setJson: jest.fn(async () => null),
      del: jest.fn(async () => null),
      ttl: jest.fn(async () => 300),
    };
    const userModel: any = {
      findOne: jest.fn(async (q: any) => (q?.phone === '+966501234567' || q?.email ? user : null)),
      findOneAndUpdate: jest.fn(async () => ({})),
    };
    void store;
    const svc = new AuthService(userModel, {} as any, {} as any, { emit: jest.fn() } as any, redis);
    return { svc, redis, userModel };
  }

  afterEach(() => {
    process.env = { ...OLD_ENV };
    jest.restoreAllMocks();
  });

  it('verifyOtp accepts an Arabic-Indic code for a Latin-stored hash', async () => {
    const { svc, redis } = authWith(
      { code_hash: bcrypt.hashSync('123456', 4), user_id: 'u1', attempts: 0 },
      { id: 'u1' },
    );
    const out: any = await svc.verifyOtp('+966501234567', '١٢٣٤٥٦');
    expect(out).toMatchObject({ ok: true });
    expect(redis.del).toHaveBeenCalled();
  });

  it('resetPassword finds the account when the phone is typed in Arabic-Indic digits', async () => {
    const { svc, userModel } = authWith(
      { code_hash: bcrypt.hashSync('123456', 4), user_id: 'u1', attempts: 0 },
      { id: 'u1', phone: '+966501234567', save: jest.fn(async function (this: any) { return this; }) },
    );
    const out: any = await svc.resetPassword('٠٥٠١٢٣٤٥٦٧', 'long-enough-password', '123456');
    expect(out).toMatchObject({ ok: true });
    expect(userModel.findOne).toHaveBeenCalledWith({ phone: '+966501234567' });
  });

  it('the OTP SMS is WebOTP/SMS-Retriever formatted when the app hash is configured', async () => {
    process.env.SMS_ENABLED = 'true';
    process.env.TAQNYAT_API_KEY = 't-key';
    process.env.SMS_WEBOTP_HASH = 'ABCDEF12345';
    process.env.API_PUBLIC_URL = 'https://api.nabd.plus';
    const axios = require('axios');
    const conn: any = { collection: jest.fn(() => ({ findOne: jest.fn(async () => null) })) };
    const svc = new SmsService(conn);
    const bodies: string[] = [];
    axios.post.mockImplementation(async (_u: string, b: any) => { bodies.push(b.body); return { status: 200 }; });
    await svc.sendOtp('+966501234567', '123456');
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('<#>');
    expect(bodies[0]).toContain('123456');
    expect(bodies[0]).toContain('ABCDEF12345');
  });

  it('OTP error strings stay exactly as the clients pin them', async () => {
    const { svc } = authWith(null, null);
    await expect(svc.verifyOtp('+966500000000', '000000')).rejects.toThrow('OTP expired or not requested');
  });
});
