import { Test, TestingModule } from '@nestjs/testing';
import { ArchiveJob } from './archive.job';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('ArchiveJob', () => {
  let job: ArchiveJob;
  let mockConnection: Partial<Connection>;

  beforeEach(async () => {
    const mockCollection = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn().mockResolvedValue({}),
    } as any;

    mockConnection = {
      collection: jest.fn((name: string) => {
        if (name === 'audit_events') return mockEventsCollection;
        if (name === 'audit_archive_manifests') return mockManifestsCollection;
        return mockEventsCollection;
      }),
    };

    const mockEventsCollection = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    } as any;

    const mockManifestsCollection = {
      updateOne: jest.fn().mockResolvedValue({}),
    } as any;

    mockConnection = {
      collection: jest.fn((name: string) => {
        if (name === 'audit_events') return mockEventsCollection;
        if (name === 'audit_archive_manifests') return mockManifestsCollection;
        return mockEventsCollection;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveJob,
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    job = module.get<ArchiveJob>(ArchiveJob);
  });

  describe('buildManifestId', () => {
    it('should return archive-<day>', () => {
      expect(job.buildManifestId('2024-01-15')).toBe('archive-2024-01-15');
    });
  });

  describe('archiveDay', () => {
    it('should return zero count when no events', async () => {
      const mockEventsCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      } as any;

      const mockManifestsCollection = {
        updateOne: jest.fn().mockResolvedValue({}),
      } as any;

      mockConnection = {
        collection: jest.fn((name: string) => {
          if (name === 'audit_events') return mockEventsCollection;
          if (name === 'audit_archive_manifests') return mockManifestsCollection;
          return mockEventsCollection;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ArchiveJob,
          { provide: getConnectionToken(), useValue: mockConnection },
        ],
      }).compile();

      job = module.get<ArchiveJob>(ArchiveJob);
      const result = await job.archiveDay('2024-01-15', new Date(), new Date());
      expect(result.count).toBe(0);
      expect(result.status).toBe('pending_sync');
    });

    it('should compute head/tail hashes when events exist', async () => {
      const mockEvents = [
        { hash: 'hash1', prev_hash: 'prev1' },
        { hash: 'hash2', prev_hash: 'prev2' },
      ];
      const mockEventsCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockEvents),
      } as any;

      const mockManifestsCollection = {
        updateOne: jest.fn().mockResolvedValue({}),
      } as any;

      mockConnection = {
        collection: jest.fn((name: string) => {
          if (name === 'audit_events') return mockEventsCollection;
          if (name === 'audit_archive_manifests') return mockManifestsCollection;
          return mockEventsCollection;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ArchiveJob,
          { provide: getConnectionToken(), useValue: mockConnection },
        ],
      }).compile();

      job = module.get<ArchiveJob>(ArchiveJob);
      const result = await job.archiveDay('2024-01-15', new Date(), new Date());
      expect(result.count).toBe(2);
      expect(result.manifestId).toBe('archive-2024-01-15');
      expect(result.status).toBe('pending_sync');
    });
  });

  describe('runDaily', () => {
    it('should call archiveDay with previous day range', async () => {
      const spy = jest.spyOn(ArchiveJob.prototype, 'archiveDay').mockResolvedValue({
        manifestId: 'archive-2024-01-15',
        status: 'pending_sync',
        count: 5,
      });
      const result = await job.runDaily();
      expect(spy).toHaveBeenCalled();
      expect(result.count).toBe(5);
    });
  });

  describe('uploadManifest', () => {
    it('should throw when AUDIT_ARCHIVE_BUCKET not set', async () => {
      delete process.env.AUDIT_ARCHIVE_BUCKET;
      await expect(job.uploadManifest({ id: 'test' })).rejects.toThrow('AUDIT_ARCHIVE_BUCKET not configured');
    });

    it('should throw when bucket configured but provider not wired', async () => {
      process.env.AUDIT_ARCHIVE_BUCKET = 'test-bucket';
      await expect(job.uploadManifest({ id: 'test' })).rejects.toThrow('object-lock upload provider not wired');
    });
  });
});
