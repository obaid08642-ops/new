import { Module } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller';
import { CatalogsSeedService } from './catalogs-seed.service';

@Module({ controllers: [CatalogsController], providers: [CatalogsSeedService] })
export class CatalogsModule {}
