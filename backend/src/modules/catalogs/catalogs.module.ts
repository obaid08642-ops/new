import { Module } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller';
import { CatalogsSeedService } from './catalogs-seed.service';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';

@Module({ controllers: [CatalogsController], providers: [CatalogsSeedService, RedisCacheInterceptor] })
export class CatalogsModule {}
