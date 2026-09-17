import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetCatalogQuery } from './get-catalog.query';

@QueryHandler(GetCatalogQuery)
export class GetCatalogHandler implements IQueryHandler<GetCatalogQuery> {
  constructor(
    // Use any for dependencies to avoid circular imports
    private readonly medicinesService: any,
    private readonly redisService?: any,
    private readonly lruCache?: any,
  ) {}
  async execute(query: GetCatalogQuery) {
    // Try LRU → Redis SWR → DB
    const key = `cqrs:catalog:${JSON.stringify(query.filters)}`;
    if (this.lruCache?.get) {
      const hit = this.lruCache.get(key);
      if (hit) return hit;
    }
    if (this.redisService?.getWithSWR) {
      return this.redisService.getWithSWR(key, 300, async () => {
        // Fallback to medicines service
        return this.medicinesService.publicList?.(query.filters) || [];
      });
    }
    return this.medicinesService.publicList?.(query.filters) || [];
  }
}
