import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService, guestDeviceHash } from './auth.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.module';

/**
 * Q91: POST /auth/guest and POST /auth/convert-guest must never hand out a
 * token for a registered account. Before the fix, a known phone number
 * (guest) or a known email (convert-guest "merge") was enough to get a
 * full session for the victim.
 */
describe('AuthService guest flows cannot take over a registered account (Q91)', () => {
  let service: AuthService;
  let userModel: any;
  let patientModel: any;
  let jwtService: any;
  let redisClient: any;
  let bindings: Map<string, any>;

  const victim = { id: 'victim-1', phone: '+966500000123', email: 'victim@nabd.test', is_guest: false, role: 'patient', token_version: 0 };

  beforeEach(async () => {
    bindings = new Map<string, any>();
    const guestDevices = {
      createIndex: jest.fn().mockResolvedValue('ok'),
      findOne: jest.fn(async (q: any) => bindings.get(q.device_hash) ?? null),
      updateOne: jest.fn(async (q: any, u: any) => {
        const row = bindings.get(q.device_hash);
        if (!row || (q.guest_id && row.guest_id !== q.guest_id)) return { matchedCount: 0 };
        bindings.set(q.device_hash, { ...row, ...(u.$set || {}) });
        return { matchedCount: 1 };
      }),
      findOneAndUpdate: jest.fn(async (q: any, u: any) => {
        if (!bindings.has(q.device_hash)) bindings.set(q.device_hash, { ...(u.$setOnInsert || {}) });
        return bindings.get(q.device_hash);
      }),
    };
    userModel = { findOne: jest.fn(), create: jest.fn(), deleteOne: jest.fn(), db: { model: jest.fn(), collection: () => guestDevices } };
    patientModel = { create: jest.fn(), deleteOne: jest.fn(), findOneAndUpdate: jest.fn() };
    jwtService = { sign: jest.fn((payload: any) => `jwt-for-${payload.id || payload.sub}`) };
    redisClient = { get: jest.fn(), set: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: userModel },
        { provide: 'PatientProfileRepository', useValue: patientModel },
        { provide: JwtService, useValue: jwtService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: RedisService, useValue: { getClient: () => redisClient, setJson: jest.fn(), getJson: jest.fn(), del: jest.fn() } },
        { provide: MailService, useValue: { sendOtp: jest.fn() } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  const signedIds = () => jwtService.sign.mock.calls.map((c: any[]) => c[0]?.id || c[0]?.sub);

  const DEVICE = 'attacker-device-0001';

  it('guest with the phone of a registered user creates a separate guest, not a victim session', async () => {
    userModel.findOne.mockImplementation(async (q: any) => (q.phone === victim.phone ? victim : null));
    userModel.create.mockImplementation(async (doc: any) => ({ id: 'guest-new', ...doc }));

    const res: any = await service.guest(victim.phone, DEVICE);

    expect(res.user.id).toBe('guest-new');
    expect(res.user.is_guest).toBe(true);
    expect(res.user.phone).not.toBe(victim.phone);
    expect(signedIds()).not.toContain(victim.id);
  });

  // 21.1: this test used to say "a guest row is reused by its phone". That was the hole: the phone is unverified input, so
  // anyone who knew the number a guest had typed got that guest's session (and its cart, orders and addresses).
  it('a guest row is NOT reachable by its phone: the phone is ignored, the device decides', async () => {
    const g = { id: 'guest-old', phone: '+966500000999', is_guest: true, role: 'patient' };
    userModel.findOne.mockImplementation(async (q: any) => (q.phone === g.phone ? g : null));
    userModel.create.mockImplementation(async (doc: any) => ({ id: 'guest-new', ...doc }));

    const res: any = await service.guest(g.phone, DEVICE);

    expect(res.user.id).toBe('guest-new');
    expect(signedIds()).not.toContain('guest-old');
    expect(userModel.create.mock.calls[0][0].phone).not.toBe(g.phone);
  });

  it('a device binding that points at a converted (registered) account is not re-issued', async () => {
    const hash = guestDeviceHash(DEVICE);
    bindings.set(hash, { device_hash: hash, guest_id: victim.id });
    userModel.findOne.mockImplementation(async (q: any) => (q.id === victim.id ? victim : null));
    userModel.create.mockImplementation(async (doc: any) => ({ id: 'guest-new', ...doc }));

    const res: any = await service.guest(undefined, DEVICE);

    expect(res.user.id).toBe('guest-new');
    expect(signedIds()).not.toContain(victim.id);
    expect(bindings.get(hash).guest_id).toBe('guest-new');     // the stale binding is replaced
  });

  it('convert-guest with the email of another account is refused and signs no token for it', async () => {
    const guest = { id: 'guest-1', is_guest: true, save: jest.fn() };
    userModel.findOne.mockImplementation(async (q: any) => {
      if (q.id === guest.id) return guest;
      if (q.email === victim.email) return victim;
      return null;
    });

    await expect(service.convertGuest(guest.id, {
      full_name: 'Attacker', phone: '+966511111111', password: 'Attacker1!', email: victim.email,
    })).rejects.toThrow(ConflictException);
    expect(signedIds()).not.toContain(victim.id);
    expect(guest.save).not.toHaveBeenCalled();
  });
});
