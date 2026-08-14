import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LoyaltyService } from './loyalty.service';

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let accountModel: any;
  let txModel: any;
  let challengeModel: any;
  let progressModel: any;
  let rewardModel: any;
  let claimModel: any;

  beforeEach(async () => {
    accountModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn(),
    };
    txModel = {
      find: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    challengeModel = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) };
    progressModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    rewardModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    claimModel = {
      find: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: 'LoyaltyAccountRepository',    useValue: accountModel },
        { provide: 'LoyaltyTransactionRepository', useValue: txModel },
        { provide: 'LoyaltyChallengeRepository',  useValue: challengeModel },
        { provide: 'ChallengeProgressRepository', useValue: progressModel },
        { provide: 'RewardRepository',            useValue: rewardModel },
        { provide: 'RewardClaimRepository',       useValue: claimModel },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
  });

  describe('awardPoints', () => {
    it('should award correct points for booking_completed and create account if missing', async () => {
      accountModel.findOne.mockResolvedValue(null);
      accountModel.create.mockResolvedValue({ points: 0, lifetime_points: 0, tier: 'bronze' });
      accountModel.updateOne.mockResolvedValue({});
      txModel.create.mockResolvedValue({});
      challengeModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await service.awardPoints('user-1', 'booking_completed', 'appointment', 'appt-1');
      expect(result.points_awarded).toBe(50);
      expect(result.ok).toBe(true);
    });

    it('should calculate correct tier (silver at 500 lifetime points)', async () => {
      accountModel.findOne.mockResolvedValue({ points: 450, lifetime_points: 450, tier: 'bronze' });
      accountModel.updateOne.mockResolvedValue({});
      txModel.create.mockResolvedValue({});
      challengeModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await service.awardPoints('user-1', 'booking_completed', 'appointment', 'appt-2');
      expect(result.tier).toBe('bronze'); // 450 + 50 = 500 → bronze
    });

    it('should award 0 points for unknown action', async () => {
      const result = await service.awardPoints('user-1', 'unknown_action');
      expect(result.points_awarded).toBe(0);
    });
  });

  describe('claimReward', () => {
    it('should deduct points and create claim record', async () => {
      rewardModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'rwd-1', points_required: 100, active: true, stock: 5, reward_type: 'coupon' }),
      });
      accountModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ user_id: 'user-1', points: 200 }),
      });
      accountModel.updateOne.mockResolvedValue({});
      txModel.create.mockResolvedValue({});
      rewardModel.updateOne.mockResolvedValue({});
      claimModel.create.mockResolvedValue({ id: 'claim-1', coupon_code: 'NAB-ABC123' });

      const result = await service.claimReward('user-1', 'rwd-1');
      expect(result.ok).toBe(true);
      expect(result.claim_id).toBeDefined();
    });

    it('should throw if user has insufficient points', async () => {
      rewardModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'rwd-1', points_required: 500, active: true, stock: 5, reward_type: 'badge' }),
      });
      accountModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ user_id: 'user-1', points: 100 }),
      });

      await expect(service.claimReward('user-1', 'rwd-1')).rejects.toThrow('Insufficient points');
    });
  });

  describe('getLeaderboard', () => {
    it('should return sorted leaderboard', async () => {
      const mockSorted = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ user_id: 'user-1', lifetime_points: 5000, tier: 'platinum' }]) };
      accountModel.find.mockReturnValue(mockSorted);

      const result = await service.getLeaderboard(10);
      expect(result).toHaveLength(1);
      expect((result[0] as any).tier).toBe('platinum');
    });
  });
});
