import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetCatalogQuery } from './get-catalog.query';
import { Injectable, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@QueryHandler(GetCatalogQuery)
export class GetCatalogHandler implements IQueryHandler<GetCatalogQuery> {
  constructor(
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {}

  async execute(query: GetCatalogQuery) {
    const key = `cqrs:catalog:${JSON.stringify(query.filters)}`;
    let lruCache: any;
    let redisService: any;
    let medicinesService: any;

    if (this.moduleRef) {
      try { lruCache = this.moduleRef.get('LruCacheService', { strict: false }); } catch (_) {}
      try { redisService = this.moduleRef.get('RedisService', { strict: false }); } catch (_) {}
      try { medicinesService = this.moduleRef.get('MedicinesService', { strict: false }); } catch (_) {}
    }

    if (lruCache?.get) {
      const hit = lruCache.get(key);
      if (hit) return hit;
    }
    if (redisService?.getWithSWR) {
      return redisService.getWithSWR(key, 300, async () => {
        return medicinesService?.publicList?.(query.filters) || [];
      });
    }
    return medicinesService?.publicList?.(query.filters) || [];
  }
}
