import { LruCacheService } from './lru-cache.service';
import { SingleFlightService } from './single-flight.service';

describe('Performance Common Services', () => {
  describe('LruCacheService', () => {
    let service: LruCacheService;

    beforeEach(() => {
      service = new LruCacheService();
    });

    it('should set and get values with 0ms in-process lookup', () => {
      service.set('test-key', { id: 123, name: 'Paracetamol' });
      expect(service.has('test-key')).toBe(true);
      const result = service.get<any>('test-key');
      expect(result).toEqual({ id: 123, name: 'Paracetamol' });
    });

    it('should return undefined for missing keys', () => {
      expect(service.get('nonexistent')).toBeUndefined();
    });

    it('should delete keys properly', () => {
      service.set('del-key', 'value');
      service.delete('del-key');
      expect(service.has('del-key')).toBe(false);
    });
  });

  describe('SingleFlightService', () => {
    let service: SingleFlightService;

    beforeEach(() => {
      service = new SingleFlightService();
    });

    it('should coalesce concurrent calls to a single execution', async () => {
      let callCount = 0;
      const slowFn = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'success';
      };

      const [res1, res2, res3] = await Promise.all([
        service.execute('coalesce-key', slowFn),
        service.execute('coalesce-key', slowFn),
        service.execute('coalesce-key', slowFn),
      ]);

      expect(res1).toBe('success');
      expect(res2).toBe('success');
      expect(res3).toBe('success');
      expect(callCount).toBe(1); // Only 1 database/upstream call made!
    });
  });
});
