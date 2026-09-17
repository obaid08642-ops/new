import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GetCatalogHandler } from './queries/get-catalog.handler';

@Module({
  imports: [CqrsModule],
  providers: [GetCatalogHandler],
  exports: [CqrsModule],
})
export class CatalogCqrsModule {}
