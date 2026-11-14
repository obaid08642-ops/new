import { Reflector } from '@nestjs/core';
import { PUBLIC_CACHE_KEY } from '../../common/public-cache.decorator';
import { PublicMedicinesController } from './medicines.controller';

describe('GET /public/medicines (anonymous paged list)', () => {
  const paginate = jest.fn();
  const controller = new PublicMedicinesController({ paginate } as any);

  beforeEach(() => paginate.mockReset().mockResolvedValue({ data: [], total: 0, page: 1, limit: 24, total_pages: 0 }));

  it('is edge-cacheable for 5 minutes and purged by the medicines tag', () => {
    const meta = new Reflector().get(PUBLIC_CACHE_KEY, PublicMedicinesController.prototype.list);
    expect(meta).toMatchObject({ ttl: 300, cacheControl: 'public, s-maxage=300, stale-while-revalidate=600' });
    expect(meta.tags).toEqual(expect.arrayContaining(['catalog', 'medicines']));
  });

  it('reads the governed catalogue page with the ranked default and no pharmacy or user', async () => {
    await controller.list(undefined, ' panadol ', 'cat', undefined, '2', '24');
    expect(paginate).toHaveBeenCalledWith('panadol', 'cat', 2, 24, false, 'smart_ranking');
  });

  it('drops control characters from the query', async () => {
    await controller.list('a\u0000b', undefined, undefined, 'trending', undefined, undefined);
    expect(paginate).toHaveBeenCalledWith('ab', undefined, 1, 30, false, 'trending');
  });
});
