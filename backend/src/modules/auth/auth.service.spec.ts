import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let patientModel: any;
  let jwtService: any;
  let eventEmitter: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: userModel },
        { provide: 'PatientProfileRepository', useValue: patientModel },
        { provide: JwtService, useValue: jwtService },
        { provide: EventEmitter2, useValue: eventEmitter },
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
      expect(res.token).toBe('mock-jwt-token');
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
});
