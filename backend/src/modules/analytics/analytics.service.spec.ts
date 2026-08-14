import { RedisService } from '../redis/redis.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.module';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let eventModel: any;

  beforeEach(async () => {
    eventModel = {
      create: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: RedisService, useValue: {} },{ provide: 'DatabaseConnection', useValue: {} },
        AnalyticsService,
        { provide: getModelToken('AnalyticsEvent'), useValue: eventModel },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should log an event correctly', async () => {
    const dto = {
      event_type: 'search',
      domain: 'doctor',
      metadata: { query: 'cardiologist' },
      session_id: 'sess-123',
    };
    eventModel.create.mockResolvedValue({ id: 'evt-1', ...dto });

    const res = await service.logEvent('u1', '127.0.0.1', 'Mozilla', dto);
    expect(res.id).toBe('evt-1');
    expect(eventModel.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u1',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla',
      event_type: 'search',
      domain: 'doctor',
      session_id: 'sess-123',
    }));
  });

  it('should return popular searches correctly', async () => {
    const mockAgg = [{ query: 'cardiologist', count: 12 }];
    eventModel.aggregate.mockResolvedValue(mockAgg);

    const res = await service.popularSearches('doctor', 5);
    expect(res).toEqual(mockAgg);
    expect(eventModel.aggregate).toHaveBeenCalled();
  });
});
