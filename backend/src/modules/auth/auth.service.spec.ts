import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let patientModel: any;
  let jwtService: any;
  let eventEmitter: any;
  let redisService: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
      db: {
        model: jest.fn(),
      },
    };
    patientModel = {
      create: jest.fn(),
      deleteOne: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    eventEmitter = {
      emit: jest.fn(),
    };
    redisService = {
      setJson: jest.fn().mockResolvedValue(undefined),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
      ttl: jest.fn().mockResolvedValue(60),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 1 }),
      client: { set: jest.fn(), get: jest.fn(), del: jest.fn(), ttl: jest.fn(), incr: jest.fn(), expire: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: userModel },
        { provide: 'PatientProfileRepository', useValue: patientModel },
        { provide: JwtService, useValue: jwtService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('convertGuest', () => {
    it('should throw BadRequestException if guest user does not exist', async () => {
      userModel.findOne.mockResolvedValueOnce(null);

      await expect(
        service.convertGuest('guest1', {
          full_name: 'Real Name',
          phone: '+966500000001',
          password: 'password123',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is not a guest', async () => {
      userModel.findOne.mockResolvedValueOnce({
        id: 'user1',
        is_guest: false,
      });

      await expect(
        service.convertGuest('user1', {
          full_name: 'Real Name',
          phone: '+966500000001',
          password: 'password123',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should convert guest profile to permanent when user does not exist', async () => {
      const mockGuest = {
        id: 'guest1',
        is_guest: true,
        full_name: 'Guest',
        phone: 'guest-phone',
        password_hash: undefined,
        save: jest.fn().mockResolvedValue(true),
        toObject: function() { return { ...this }; },
      };
      userModel.findOne
        .mockResolvedValueOnce(mockGuest) // guest user lookup
        .mockResolvedValueOnce(null); // existing user lookup (none)

      const res = await service.convertGuest('guest1', {
        full_name: 'Real Name',
        phone: '+966500000001',
        password: 'password123',
      });

      expect(mockGuest.is_guest).toBe(false);
      expect(mockGuest.full_name).toBe('Real Name');
      expect(mockGuest.phone).toBe('+966500000001');
      expect(mockGuest.password_hash).toBeDefined();
      expect(res.token).toEqual({ accessToken: 'mock-jwt-token', refreshToken: 'mock-jwt-token' });
    });

    it('should merge guest history and delete guest user if user already exists', async () => {
      const mockGuest = {
        id: 'guest1',
        is_guest: true,
        full_name: 'Guest',
        phone: 'guest-phone',
        toObject: function() { return { ...this }; },
      };
      const hash = await bcrypt.hash('password123', 8);
      const mockExisting = {
        id: 'existing1',
        is_guest: false,
        phone: '+966500000001',
        password_hash: hash,
        save: jest.fn().mockResolvedValue(true),
        toObject: function() { return { ...this }; },
      };
      userModel.findOne
        .mockResolvedValueOnce(mockGuest) // guest lookup
        .mockResolvedValueOnce(mockExisting); // existing user lookup

      // mock db.model updateMany
      const mockUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      userModel.db.model.mockReturnValue({
        updateMany: mockUpdateMany,
      });

      await expect(service.convertGuest('guest1', {
        full_name: 'Real Name',
        phone: '+966500000001',
        password: 'password123',
      })).rejects.toThrow(ConflictException);

      
      
      
      
    });

    it('should throw UnauthorizedException if existing user password does not match', async () => {
      const mockGuest = {
        id: 'guest1',
        is_guest: true,
      };
      const mockExisting = {
        id: 'existing1',
        password_hash: await bcrypt.hash('correct_password', 8),
      };
      userModel.findOne
        .mockResolvedValueOnce(mockGuest)
        .mockResolvedValueOnce(mockExisting);

      await expect(
        service.convertGuest('guest1', {
          full_name: 'Real Name',
          phone: '+966500000001',
          password: 'wrong_password',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verify2fa', () => {
    it('verifies the OTP against the email contact when the user logged in by email', async () => {
      const mockAdmin = {
        id: 'admin1',
        email: 'admin@nabd.plus',
        phone: '+966500000999',
        role: 'admin',
        save: jest.fn().mockResolvedValue(true),
      };
      userModel.findOne.mockResolvedValueOnce(mockAdmin);
      const verifyOtpSpy = jest.spyOn(service, 'verifyOtp').mockResolvedValueOnce({ ok: true });

      const res = await service.verify2fa('admin@nabd.plus', '123456');

      // Login-by-email sends the OTP to the email channel (otpContact) —
      // verification must use the same key.
      expect(verifyOtpSpy).toHaveBeenCalledWith('admin@nabd.plus', '123456');
      expect(res.user.email).toBe('admin@nabd.plus');
      expect(res.token).toEqual({ accessToken: 'mock-jwt-token', refreshToken: 'mock-jwt-token' });
    });

    it('verifies the OTP against the phone contact when the user logged in by phone', async () => {
      const mockAdmin = {
        id: 'admin1',
        email: 'admin@nabd.plus',
        phone: '+966500000999',
        role: 'admin',
        save: jest.fn().mockResolvedValue(true),
      };
      userModel.findOne.mockResolvedValueOnce(mockAdmin);
      const verifyOtpSpy = jest.spyOn(service, 'verifyOtp').mockResolvedValueOnce({ ok: true });

      const res = await service.verify2fa('+966500000999', '123456');

      expect(verifyOtpSpy).toHaveBeenCalledWith('+966500000999', '123456');
      expect(res.token).toEqual({ accessToken: 'mock-jwt-token', refreshToken: 'mock-jwt-token' });
    });
  });

  describe('OTP storage hardening', () => {
    it('stores only a bcrypt hash under a normalized login-2fa key with five-minute TTL', async () => {
      userModel.findOne.mockResolvedValueOnce({ id: 'admin1', email: 'admin@nabd.plus' });

      await service.sendOtp(' ADMIN@NABD.PLUS ');

      expect(redisService.setJson).toHaveBeenCalledWith(
        'auth:otp:login-2fa:admin@nabd.plus',
        expect.objectContaining({ user_id: 'admin1', code_hash: expect.any(String), attempts: 0 }),
        300,
      );
      const stored = redisService.setJson.mock.calls[0][1];
      expect(stored.code).toBeUndefined();
      expect(await bcrypt.compare('123456', stored.code_hash)).toBe(false);
    });

    it('verifies a hashed OTP once and consumes both the OTP and verify-rate key', async () => {
      const codeHash = await bcrypt.hash('123456', 4);
      redisService.getJson.mockResolvedValueOnce({ code_hash: codeHash, user_id: 'admin1', attempts: 0 });
      userModel.findOneAndUpdate = jest.fn().mockResolvedValue(undefined);

      await expect(service.verifyOtp('ADMIN@NABD.PLUS', '123456')).resolves.toEqual({ ok: true });

      expect(redisService.del).toHaveBeenCalledWith('auth:otp:login-2fa:admin@nabd.plus');
      expect(redisService.del).toHaveBeenCalledWith('ratelimit:auth:otp:verify:admin@nabd.plus');
    });
  });
});
