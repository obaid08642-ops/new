import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/auth.guard';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

/**
 * Resolves public share-link slugs (/s/:type/:slug in the patient app) to real
 * entity ids. Only published/active entities resolve — no fabricated redirects.
 */
@Controller('seo')
export class SeoController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  // R4: GET resolve removed (dup of seo-search, which has R69 handling).
}
