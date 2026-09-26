import { IndexNowService } from './indexnow.service';

describe('IndexNowService', () => {
  let service: IndexNowService;

  const mockInsertOne = jest.fn().mockResolvedValue({ insertedId: 'sub-1' });
  const mockFind = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        project: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { host: 'nabd.plus', urls_count: 2, success: true },
          ]),
        }),
      }),
    }),
  });

  const mockConnection = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'indexnow_submissions') {
        return {
          insertOne: mockInsertOne,
          find: mockFind,
        };
      }
      return {};
    }),
  } as any;

  beforeEach(() => {
    service = new IndexNowService(mockConnection);
    jest.clearAllMocks();
  });

  describe('getKey', () => {
    it('returns default or env key', () => {
      expect(service.getKey()).toBe('nabdplusindexnowkey');
    });
  });

  describe('submitUrls', () => {
    it('returns empty result if no urls provided', async () => {
      const res = await service.submitUrls([]);
      expect(res.success).toBe(false);
      expect(res.urls_submitted).toBe(0);
      expect(res.message).toBe('no_urls_provided');
    });

    it('submits URLs to IndexNow endpoint and records to MongoDB', async () => {
      // Mock global fetch
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
      });
      global.fetch = mockFetch as any;

      const testUrls = [
        'https://nabd.plus/ar/p/panadol-advance',
        'https://nabd.plus/ar/doctor/dr-sara',
      ];

      const res = await service.submitUrls(testUrls);
      expect(res.success).toBe(true);
      expect(res.urls_submitted).toBe(2);
      expect(res.statusCode).toBe(200);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.indexnow.org/indexnow',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }),
        }),
      );

      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          urls_count: 2,
          success: true,
          statusCode: 200,
        }),
      );
    });
  });

  describe('getRecentSubmissions', () => {
    it('fetches recent submissions from database', async () => {
      const subs = await service.getRecentSubmissions(10);
      expect(subs).toHaveLength(1);
      expect(subs[0].host).toBe('nabd.plus');
    });
  });
});
