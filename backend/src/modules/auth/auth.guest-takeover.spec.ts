import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from './auth.service';
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

  const victim = { id: 'victim-1', phone: '+966500000123', email: 'victim@nabd.test', is_guest: false, role: 'patient', token_version: 0 };

  beforeEach(async () => {
    userModel = { findOne: jest.fn(), create: jest.fn(), deleteOne: jest.fn(), db: { model: jest.fn() } };
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

  it('guest with the phone of a registered user creates a separate guest, not a victim session', async () => {
    userModel.findOne.mockImplementation(async (q: any) => (q.phone === victim.phone ? victim : null));
    userModel.create.mockImplementation(async (doc: any) => ({ id: 'guest-new', ...doc }));

    const res: any = await service.guest(victim.phone);

    expect(res.user.id).toBe('guest-new');
    expect(res.user.is_guest).toBe(true);
    expect(res.user.phone).not.toBe(victim.phone);
    expect(signedIds()).not.toContain(victim.id);
  });

  it('guest with the phone of an existing guest row still reuses that guest', async () => {
    const g = { id: 'guest-old', phone: '+966500000999', is_guest: true, role: 'patient' };
    userModel.findOne.mockImplementation(async (q: any) => (q.phone === g.phone ? g : null));

    const res: any = await service.guest(g.phone);

    expect(res.user.id).toBe('guest-old');
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('a device binding that points at a converted (registered) account is not re-issued', async () => {
    redisClient.get.mockResolvedValue(victim.id);
    userModel.findOne.mockImplementation(async (q: any) => (q.id === victim.id ? victim : null));
    userModel.create.mockImplementation(async (doc: any) => ({ id: 'guest-new', ...doc }));

    const res: any = await service.guest(undefined, 'attacker-device-0001');

    expect(res.user.id).toBe('guest-new');
    expect(signedIds()).not.toContain(victim.id);
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
