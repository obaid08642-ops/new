import { Test, TestingModule } from '@nestjs/testing';
import { LogRetentionService, LOG_RETENTION_DAYS } from './log-retention.service';
import { getModelToken } from '@nestjs/mongoose';

describe('LogRetentionService', () => {
  let service: LogRetentionService;
  let mockModel: any;

  beforeEach(async () => {
    mockModel = {
      createIndex: jest.fn().mockResolvedValue(true),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogRetentionService,
        { provide: getModelToken('AuditLog'), useValue: mockModel },
      ],
    }).compile();

    service = module.get<LogRetentionService>(LogRetentionService);
  });

  describe('LOG_RETENTION_DAYS constants', () => {
    it('has correct retention periods', () => {
      expect(LOG_RETENTION_DAYS.audit).toBe(2555); // 7 years
      expect(LOG_RETENTION_DAYS.security).toBe(2555); // 7 years
      expect(LOG_RETENTION_DAYS.application).toBe(90);
      expect(LOG_RETENTION_DAYS.debug).toBe(30);
    });
  });

  describe('getRetentionPolicy', () => {
    it('returns policy with correct structure', () => {
      const policy = service.getRetentionPolicy();
      
      expect(policy.audit).toEqual({
        collection: 'auditlogs',
        days: 2555,
        description: 'Audit trail for all mutations (append-only)',
      });
      expect(policy.security).toEqual({
        collection: 'auditlogs',
        days: 2555,
        description: 'Security events (login failures, admin actions, etc.)',
      });
      expect(policy.application).toEqual({
        collection: 'applicationlogs',
        days: 90,
        description: 'General application logs',
      });
      expect(policy.debug).toEqual({
        collection: 'debuglogs',
        days: 30,
        description: 'Debug and trace logs',
      });
    });
  });

  describe('runRetentionCleanup', () => {
    it('calls deleteMany with correct cutoff date', async () => {
      mockModel.deleteMany.mockResolvedValue({ deletedCount: 5 });
      
      await service.runRetentionCleanup();
      
      expect(mockModel.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: { $lt: expect.any(Date) },
          severity: { $ne: 'critical' },
        }),
      );
    });
  });
});